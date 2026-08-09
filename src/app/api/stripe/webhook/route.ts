import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { buildBookingConfirmationEmailHtml } from "@/lib/booking-confirmation-email";
import { buildMerchOrderEmailHtml } from "@/lib/merch-order-email";
import { Resend } from "resend";
import Stripe from "stripe";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const PASS_CONFIGS: Record<string, { classes: number; validityDays: number | null }> = {
  casual: { classes: 1,  validityDays: null },
  double: { classes: 1,  validityDays: null },
  intro:  { classes: 3,  validityDays: 90   },
  five:   { classes: 5,  validityDays: 180  },
  ten:    { classes: 10, validityDays: 485  },
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = adminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    const meta = session.metadata ?? {};

    if (meta.type === "merch") {
      const { productId, studentId: merchStudentId, size } = meta;

      await supabase
        .from("merch_orders")
        .update({ status: "paid", amount_paid_cents: session.amount_total })
        .eq("stripe_session_id", session.id);

      const { data: product } = await supabase.from("merch_products").select("title").eq("id", productId).single();
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", merchStudentId).single();

      if (profile?.email && product) {
        const firstName = (profile.full_name ?? "dancer").split(" ")[0];
        await resend.emails.send({
          from: `BYLA <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
          to: profile.email,
          subject: `Order confirmed – ${product.title}`,
          html: buildMerchOrderEmailHtml({ firstName, productTitle: product.title, size: size || null, amountPaidCents: session.amount_total }),
        }).catch((e) => console.error("Merch order confirmation email error:", e));
      }

      const { error: merchInstructorEmailError } = await resend.emails.send({
        from: `BYLA <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: process.env.NEXT_PUBLIC_INSTRUCTOR_EMAIL!,
        subject: `New merch order – ${profile?.full_name ?? "A student"}`,
        html: `<p><strong>${profile?.full_name ?? "A student"}</strong> (${profile?.email ?? ""}) just bought <strong>${product?.title ?? "a product"}</strong>${size ? ` (Size ${size})` : ""}.</p>`,
      }).catch((e) => ({ error: e }));
      if (merchInstructorEmailError) console.error("Instructor merch notification email error:", merchInstructorEmailError);

      return NextResponse.json({ received: true });
    }

    const { passTypeId, studentId, classId, isDoublePass, discountId } = meta;

    if (!passTypeId || !studentId) {
      return NextResponse.json({ received: true });
    }

    const config = PASS_CONFIGS[passTypeId];
    if (!config) return NextResponse.json({ received: true });

    const expiresAt = config.validityDays
      ? new Date(Date.now() + config.validityDays * 86400000).toISOString()
      : null;

    // Create the pass record
    const { data: pass } = await supabase
      .from("passes")
      .insert({
        student_id: studentId,
        pass_type_id: passTypeId,
        classes_total: config.classes,
        classes_remaining: config.classes,
        expires_at: expiresAt,
        stripe_session_id: session.id,
        source: "stripe",
        amount_paid_cents: session.amount_total,
      })
      .select()
      .single();

    // For casual and double passes, immediately book the class
    if (classId && pass && (passTypeId === "casual" || passTypeId === "double")) {
      const guestCount = isDoublePass === "true" ? 1 : 0;

      await supabase.from("registrations").upsert({
        class_id: classId,
        student_id: studentId,
        status: "confirmed",
        amount_paid_cents: session.amount_total,
        pass_id: pass.id,
        guest_count: guestCount,
        payment_type: passTypeId === "double" ? "double" : "casual",
      }, { onConflict: "class_id,student_id" });

      // Deduct the class credit
      await supabase
        .from("passes")
        .update({ classes_remaining: 0 })
        .eq("id", pass.id);
    }

    // Notify instructor
    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", studentId).single();
    const passLabel = passTypeId === "casual" ? "Casual ($24)" : passTypeId === "double" ? "Double Pass ($38)" : passTypeId === "intro" ? "Intro Pass (3 classes)" : passTypeId === "five" ? "5-Class Pass" : "10-Class Pass";
    let emailBody = `<p><strong>${profile?.full_name ?? "A student"}</strong> (${profile?.email ?? ""}) just purchased a <strong>${passLabel}</strong>.`;
    if (classId) {
      const { data: cls } = await supabase.from("classes").select("title, class_date").eq("id", classId).single();
      if (cls) {
        const classDate = new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        emailBody += ` They are booked in for <strong>${cls.title}</strong> on ${classDate}.`;

        if (profile?.email && (passTypeId === "casual" || passTypeId === "double")) {
          const firstName = (profile.full_name ?? "dancer").split(" ")[0];
          const guestCount = isDoublePass === "true" ? 1 : 0;
          await resend.emails.send({
            from: `BYLA <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
            to: profile.email,
            subject: `You're booked – ${cls.title}`,
            html: buildBookingConfirmationEmailHtml({ firstName, classTitle: cls.title, classDate, guestCount }),
          }).catch((e) => console.error("Booking confirmation email error:", e));
        }
      }
    }
    emailBody += `</p>`;
    const { error: instructorEmailError } = await resend.emails.send({
      from: `BYLA <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
      to: process.env.NEXT_PUBLIC_INSTRUCTOR_EMAIL!,
      subject: `New booking – ${profile?.full_name ?? "A student"}`,
      html: emailBody,
    }).catch((e) => ({ error: e }));
    if (instructorEmailError) console.error("Instructor notification email error:", instructorEmailError);

    // Increment discount code usage
    if (discountId) {
      const { data: dc } = await supabase.from("discount_codes").select("uses_count").eq("id", discountId).single();
      if (dc) {
        await supabase.from("discount_codes").update({ uses_count: dc.uses_count + 1 }).eq("id", discountId);
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.CheckoutSession;
    const { studentId, classId } = session.metadata ?? {};

    if (classId && studentId) {
      await supabase
        .from("registrations")
        .delete()
        .eq("class_id", classId)
        .eq("student_id", studentId)
        .eq("status", "pending");
    }
  }

  return NextResponse.json({ received: true });
}
