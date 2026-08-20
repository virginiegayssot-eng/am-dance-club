import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { buildBookingCancellationEmailHtml } from "@/lib/booking-cancellation-email";
import { Resend } from "resend";

// class_date/class_time store Sydney wall-clock time with no timezone
// offset. The server runs in UTC, so parsing that string directly (e.g.
// `new Date(`${date}T${time}`)`) silently misreads it as UTC — a 7pm Sydney
// class was treated as 7pm UTC, 10-11 hours later than reality. That let
// cancellations inside the real 24-hour window slip through as refundable.
// This converts the Sydney wall-clock time to the correct UTC instant,
// using Sydney's actual offset for that specific date (handles DST).
function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}
function sydneyDateTimeToUTC(dateStr: string, timeStr: string): Date {
  const guess = new Date(`${dateStr}T${timeStr}Z`);
  const offsetMs = getTimezoneOffsetMs(guess, "Australia/Sydney");
  return new Date(guess.getTime() - offsetMs);
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createServerSupabaseClient();
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

  const classDateTime = sydneyDateTimeToUTC(reg.classes.class_date, reg.classes.class_time ?? "07:00:00");
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
      await supabase
        .from("passes")
        .update({ classes_remaining: pass.classes_remaining + 1 })
        .eq("id", reg.pass_id);
      passRefunded = true;
    }
  }

  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
  const classDate = new Date(reg.classes.class_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (profile?.email) {
    const firstName = (profile.full_name ?? "dancer").split(" ")[0];
    const { error } = await resend.emails.send({
      from: `THE A.M Dance Club <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
      to: profile.email,
      subject: `Booking cancelled – ${reg.classes.title}`,
      html: buildBookingCancellationEmailHtml({ firstName, classTitle: reg.classes.title, classDate, passRefunded }),
    }).catch((e) => ({ error: e }));
    if (error) console.error("Cancellation confirmation email error:", error);
  }

  const { error: instructorEmailError } = await resend.emails.send({
    from: `THE A.M Dance Club <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
    to: process.env.NEXT_PUBLIC_INSTRUCTOR_EMAIL!,
    subject: `Cancellation – ${profile?.full_name ?? "A student"}`,
    html: `<p><strong>${profile?.full_name ?? "A student"}</strong> (${profile?.email}) cancelled their booking for <strong>${reg.classes.title}</strong> on ${classDate}.${passRefunded ? " Their class credit was refunded." : ""}</p>`,
  }).catch((e) => ({ error: e }));
  if (instructorEmailError) console.error("Instructor cancellation notification error:", instructorEmailError);

  return NextResponse.json({ cancelled: true, isRefundable, passRefunded });
}
