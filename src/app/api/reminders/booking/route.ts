import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sydneyDateTimeToUTC } from "@/lib/date";
import { formatTime } from "@/lib/stripe";
import { buildBookingReminderEmailHtml } from "@/lib/reminder-email";
import { sendPushToStudents } from "@/lib/push-admin";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Called on a schedule (every 15-30 min) by pg_cron — see supabase/add-reminders.sql.
// Reminds students of confirmed bookings for classes starting in ~12 hours,
// once each, tracked via registrations.reminder_sent_at.
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const admin = adminClient();

  // A coarse date-range prefilter (classes!inner makes the joined column
  // filterable) — the precise 12-hour window check happens below in JS,
  // in real Sydney time via sydneyDateTimeToUTC.
  const yesterday = new Date(Date.now() - 24 * 3_600_000).toISOString().slice(0, 10);
  const dayAfterTomorrow = new Date(Date.now() + 48 * 3_600_000).toISOString().slice(0, 10);
  const { data: candidates } = await admin
    .from("registrations")
    .select("id, student_id, classes!inner(id, title, class_date, class_time, location), profiles(full_name, email)")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gte("classes.class_date", yesterday)
    .lte("classes.class_date", dayAfterTomorrow);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const now = Date.now();
  const due = candidates.filter((reg: any) => {
    if (!reg.classes) return false;
    const classStart = sydneyDateTimeToUTC(reg.classes.class_date, reg.classes.class_time ?? "07:00:00");
    const hoursUntil = (classStart.getTime() - now) / 3_600_000;
    // 12-hour reminder, with a window matched to how often this job runs.
    return hoursUntil <= 12 && hoursUntil > 11.5;
  });

  let sent = 0;
  const errors: string[] = [];

  for (const reg of due as any[]) {
    const email = reg.profiles?.email;
    const firstName = (reg.profiles?.full_name ?? "dancer").split(" ")[0];
    const classDateLabel = new Date(reg.classes.class_date + "T00:00:00").toLocaleDateString("en-AU", {
      weekday: "long", day: "numeric", month: "long",
    });

    if (email) {
      const { error } = await resend.emails.send({
        from: `THE A.M Dance Club <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: email,
        subject: `Reminder: ${reg.classes.title} tomorrow`,
        html: buildBookingReminderEmailHtml({
          firstName,
          classTitle: reg.classes.title,
          classDateLabel,
          classTimeLabel: formatTime(reg.classes.class_time),
          location: reg.classes.location,
        }),
      }).catch((e) => ({ error: e }));
      if (error) errors.push(`${email}: ${error.message ?? error}`);
      else sent++;
    }

    await admin.from("registrations").update({ reminder_sent_at: new Date().toISOString() }).eq("id", reg.id);
  }

  const studentIds = (due as any[]).map((reg) => reg.student_id);
  if (studentIds.length > 0) {
    await sendPushToStudents(studentIds, {
      title: "Class reminder",
      body: "You've got a class coming up in about 12 hours.",
      url: "/dashboard",
    });
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
