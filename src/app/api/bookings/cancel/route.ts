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

// class_date/class_time store the studio's local wall-clock time with no
// timezone offset. The server runs in UTC, so parsing that string directly
// (e.g. `new Date(`${date}T${time}`)`) silently misreads it as UTC — a 7pm
// local class gets treated as 7pm UTC, hours later than reality — which
// shrinks the real 24-hour cancellation cutoff. Hardcoded to Australia/Sydney
// since every VIA studio so far is Sydney/Melbourne (same offset); if a
// future client is in another timezone, change the string below.
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}
function studioDateTimeToUTC(dateStr: string, timeStr: string): Date {
  const guess = new Date(`${dateStr}T${timeStr}Z`);
  const offsetMs = getTimezoneOffsetMs(guess, "Australia/Sydney");
  return new Date(guess.getTime() - offsetMs);
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServerSupabaseClient();
  const admin = adminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { registrationId } = await req.json();
  if (!registrationId) return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });

  const { data: reg } = await supabase
    .from("registrations")
    .select("*, classes(title, class_date, class_time)")
    .eq("id", registrationId)
    .eq("student_id", user.id)
    .single();

  if (!reg) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (reg.status === "cancelled") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });

  const classDateTime = studioDateTimeToUTC(reg.classes.class_date, reg.classes.class_time ?? "07:00:00");
  const hoursUntilClass = (classDateTime.getTime() - Date.now()) / 3_600_000;
  const isRefundable = hoursUntilClass >= 24;

  await supabase
    .from("registrations")
    .update({ status: "cancelled" })
    .eq("id", registrationId);

  let passRefunded = false;
  if (isRefundable && reg.pass_id) {
    const { data: pass } = await supabase
      .from("passes")
      .select("classes_remaining, classes_total")
      .eq("id", reg.pass_id)
      .single();

    if (pass) {
      // Students have no client-writable RLS policy on passes (by design,
      // see passes-schema.sql), so this must go through the admin client
      // or the refund silently fails while the email still claims it happened.
      const { error: refundError } = await admin
        .from("passes")
        .update({ classes_remaining: pass.classes_remaining + 1 })
        .eq("id", reg.pass_id);
      if (refundError) {
        console.error(`Failed to refund pass credit for pass ${reg.pass_id}:`, refundError);
      } else {
        passRefunded = true;
      }
    }
  }

  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
  const classDate = new Date(reg.classes.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (profile?.email) {
    const firstName = (profile.full_name ?? "dancer").split(" ")[0];
    const { error } = await resend.emails.send({
      from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
      to: profile.email,
      subject: `Booking cancelled – ${reg.classes.title}`,
      html: buildBookingCancellationEmailHtml({ firstName, classTitle: reg.classes.title, classDate, passRefunded }),
    }).catch((e) => ({ error: e }));
    if (error) console.error("Cancellation confirmation email error:", error);
  }

  const { error: instructorEmailError } = await resend.emails.send({
    from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
    to: process.env.NEXT_PUBLIC_INSTRUCTOR_EMAIL!,
    subject: `Cancellation – ${profile?.full_name ?? "A student"}`,
    html: `<p><strong>${profile?.full_name ?? "A student"}</strong> (${profile?.email}) cancelled their booking for <strong>${reg.classes.title}</strong> on ${classDate}.${passRefunded ? " Their class credit was refunded." : ""}</p>`,
  }).catch((e) => ({ error: e }));
  if (instructorEmailError) console.error("Instructor cancellation notification error:", instructorEmailError);

  return NextResponse.json({ cancelled: true, isRefundable, passRefunded });
}
