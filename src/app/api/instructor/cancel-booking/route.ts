import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { buildBookingCancellationEmailHtml } from "@/lib/booking-cancellation-email";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "instructor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { regId, passId, guestCount = 0 } = await req.json();
  if (!regId) return NextResponse.json({ error: "Missing regId" }, { status: 400 });

  const admin = adminClient();

  const { data: reg } = await admin.from("registrations").select("student_id, class_id").eq("id", regId).single();

  // Cancel the registration
  await admin.from("registrations").update({ status: "cancelled" }).eq("id", regId);

  // Refund pass credits if applicable
  let passRefunded = false;
  if (passId) {
    const { data: pass } = await admin.from("passes").select("classes_remaining, pass_types(*)").eq("id", passId).single();
    if (pass) {
      const maxGuests = (pass as any).pass_types?.max_guests ?? 0;
      const creditsToRefund = 1 + Math.max(0, guestCount - maxGuests);
      await admin.from("passes").update({ classes_remaining: pass.classes_remaining + creditsToRefund }).eq("id", passId);
      passRefunded = true;
    }
  }

  if (reg) {
    const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", reg.student_id).single();
    const { data: cls } = await admin.from("classes").select("title, class_date").eq("id", reg.class_id).single();

    if (profile?.email && cls) {
      const classDate = new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const firstName = (profile.full_name ?? "dancer").split(" ")[0];
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: profile.email,
        subject: `Booking cancelled – ${cls.title}`,
        html: buildBookingCancellationEmailHtml({ firstName, classTitle: cls.title, classDate, passRefunded }),
      }).catch((e) => ({ error: e }));
      if (error) console.error("Cancellation confirmation email error:", error);
    }
  }

  return NextResponse.json({ success: true });
}
