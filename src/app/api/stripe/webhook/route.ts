import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Stripe from "stripe";

const PASS_CONFIGS: Record<string, { classes: number; validityDays: number | null }> = {
  casual: { classes: 1,  validityDays: null },
  double: { classes: 1,  validityDays: null },
  intro:  { classes: 3,  validityDays: 90   },
  five:   { classes: 5,  validityDays: 180  },
  ten:    { classes: 10, validityDays: 365  },
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

  const supabase = createServerSupabaseClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.CheckoutSession;
    const meta = session.metadata ?? {};
    const { passTypeId, studentId, classId, isDoublePass } = meta;

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
