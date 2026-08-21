import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { buildBookingConfirmationEmailHtml } from "@/lib/booking-confirmation-email";
import { Resend } from "resend";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServerSupabaseClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId, passId, guestCount = 0 } = await req.json();

  // Verify the pass belongs to this user and has credits
  const { data: pass } = await supabase
    .from("passes")
    .select("*, pass_types(*)")
    .eq("id", passId)
    .eq("student_id", user.id)
    .single();

  if (!pass) return NextResponse.json({ error: "Pass not found" }, { status: 404 });

  // A pass's max_guests allowance (e.g. Double Pass) covers guests within the same credit
  const maxGuests = (pass as any).pass_types?.max_guests ?? 0;
  const creditsNeeded = 1 + Math.max(0, guestCount - maxGuests);
  if (pass.classes_remaining < creditsNeeded) return NextResponse.json({ error: creditsNeeded > 1 ? "Not enough credits for 2 people" : "No classes remaining on this pass" }, { status: 400 });
  if (pass.expires_at && new Date(pass.expires_at) < new Date()) {
    return NextResponse.json({ error: "This pass has expired" }, { status: 400 });
  }

  // Check class exists and has capacity
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (!cls || cls.is_cancelled) return NextResponse.json({ error: "Class not available" }, { status: 400 });

  const { data: regCount } = await supabase
    .from("class_registration_counts")
    .select("registered_count")
    .eq("class_id", classId)
    .single();

  const currentCount = regCount?.registered_count ?? 0;
  if (currentCount >= cls.capacity) return NextResponse.json({ error: "Class is full" }, { status: 400 });

  // Check not already registered
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .not("status", "eq", "cancelled")
    .single();

  if (existing) return NextResponse.json({ error: "Already registered" }, { status: 400 });

  // Check for existing cancelled registration to reactivate
  const { data: cancelled } = await supabase
    .from("registrations")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", user.id)
    .eq("status", "cancelled")
    .single();

  let regError;
  if (cancelled) {
    ({ error: regError } = await supabase
      .from("registrations")
      .update({ status: "confirmed", pass_id: passId, payment_type: "pass", guest_count: guestCount })
      .eq("id", cancelled.id));
  } else {
    ({ error: regError } = await supabase.from("registrations").insert({
      class_id: classId,
      student_id: user.id,
      status: "confirmed",
      pass_id: passId,
      payment_type: "pass",
      guest_count: guestCount,
    }));
  }

  if (regError) return NextResponse.json({ error: regError.message }, { status: 500 });

  // Students have no client-writable RLS policy on passes (by design, see
  // passes-schema.sql), so this must go through the admin client or the
  // credit deduction silently fails while the booking itself still succeeds.
  const { error: passUpdateError } = await admin
    .from("passes")
    .update({ classes_remaining: pass.classes_remaining - creditsNeeded })
    .eq("id", passId);
  if (passUpdateError) console.error(`Failed to deduct pass credit for pass ${passId}:`, passUpdateError);

  // Notify instructor
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
  const classDate = new Date(cls.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const emailResult = await resend.emails.send({
    from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
    to: process.env.NEXT_PUBLIC_INSTRUCTOR_EMAIL!,
    subject: `New booking – ${profile?.full_name ?? "A student"}`,
    html: `<p><strong>${profile?.full_name ?? "A student"}</strong> (${profile?.email}) just booked <strong>${cls.title}</strong> on ${classDate} using their pass${guestCount > 0 ? ` <strong>(+${guestCount} guest)</strong>` : ""}.</p>`,
  }).catch((e) => { console.error("Email error:", e); return null; });
  console.log("Email result:", JSON.stringify(emailResult));

  // Confirm booking to the student
  if (profile?.email) {
    const firstName = (profile.full_name ?? "dancer").split(" ")[0];
    await resend.emails.send({
      from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
      to: profile.email,
      subject: `You're booked – ${cls.title}`,
      html: buildBookingConfirmationEmailHtml({ firstName, classTitle: cls.title, classDate, guestCount }),
    }).catch((e) => console.error("Booking confirmation email error:", e));
  }

  return NextResponse.json({ success: true });
}
