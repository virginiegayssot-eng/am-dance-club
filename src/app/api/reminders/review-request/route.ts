import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sydneyDateTimeToUTC } from "@/lib/date";
import { buildReviewEmailHtml } from "@/lib/review-email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Called on a schedule (every 15 min) by pg_cron — see supabase/add-reminders.sql.
// Runs a generic "class end + 1h" check in real Sydney time rather than a
// single fixed daily time, since classes can run on any day/time here.
// Emails a first-time attendee (no other attended = true row) once, tracked
// via attendance.review_reminder_sent_at.
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = adminClient();
  const { data: settings } = await admin
    .from("reminder_settings")
    .select("review_request_reminders_enabled")
    .eq("id", 1)
    .single();
  if (settings && !settings.review_request_reminders_enabled) {
    return NextResponse.json({ sent: 0, skipped: "disabled" });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const yesterday = new Date(Date.now() - 24 * 3_600_000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 3_600_000).toISOString().slice(0, 10);
  const { data: candidates } = await admin
    .from("attendance")
    .select("id, student_id, class_id, classes!inner(id, class_date, class_time, duration_minutes, is_cancelled), profiles(full_name, email)")
    .eq("attended", true)
    .is("review_reminder_sent_at", null)
    .gte("classes.class_date", yesterday)
    .lte("classes.class_date", tomorrow);
  if (!candidates || candidates.length === 0) return NextResponse.json({ sent: 0 });
  const now = Date.now();
  const due = (candidates as any[]).filter((row) => {
    if (!row.classes || row.classes.is_cancelled) return false;
    const classStart = sydneyDateTimeToUTC(row.classes.class_date, row.classes.class_time ?? "19:00:00");
    const classEnd = new Date(classStart.getTime() + (row.classes.duration_minutes ?? 60) * 60_000);
    const hoursSinceEnd = (now - classEnd.getTime()) / 3_600_000;
    return hoursSinceEnd >= 0.75 && hoursSinceEnd < 1.25;
  });
  let sent = 0;
  const errors: string[] = [];
  for (const row of due) {
    await admin.from("attendance").update({ review_reminder_sent_at: new Date().toISOString() }).eq("id", row.id);
    const { data: prevAttendance } = await admin
      .from("attendance").select("id").eq("student_id", row.student_id).eq("attended", true).neq("class_id", row.class_id).limit(1);
    if (prevAttendance && prevAttendance.length > 0) continue;
    const profile = row.profiles as any;
    if (!profile?.email) continue;
    const firstName = (profile.full_name ?? "there").split(" ")[0];
    const { error } = await resend.emails.send({
      from: `Sable Studio <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
      to: profile.email,
      subject: "Thanks for dancing with us!",
      html: buildReviewEmailHtml(firstName),
    }).catch((e) => ({ error: e }));
    if (error) errors.push(`${profile.email}: ${error.message ?? error}`);
    else sent++;
  }
  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
