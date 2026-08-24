import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildWinbackEmailHtml } from "@/lib/reminder-email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const INACTIVE_DAYS = 21;

// Called once a day by pg_cron — see supabase/add-reminders.sql.
// Emails students whose most recent attended class was 3+ weeks ago and who
// haven't already had a win-back email in the last 3 weeks.
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = adminClient();

  const { data: settings } = await admin
    .from("reminder_settings")
    .select("winback_reminders_enabled")
    .eq("id", 1)
    .single();
  if (settings && !settings.winback_reminders_enabled) {
    return NextResponse.json({ sent: 0, skipped: "disabled" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 3_600_000).toISOString();

  const { data: lastAttendance } = await admin
    .from("attendance")
    .select("student_id, marked_at")
    .eq("attended", true)
    .order("marked_at", { ascending: false });

  if (!lastAttendance || lastAttendance.length === 0) return NextResponse.json({ sent: 0 });

  // Most recent attended class per student.
  const lastSeenByStudent = new Map<string, string>();
  for (const row of lastAttendance) {
    if (!lastSeenByStudent.has(row.student_id)) lastSeenByStudent.set(row.student_id, row.marked_at);
  }

  const lapsedIds = [...lastSeenByStudent.entries()]
    .filter(([, lastSeen]) => lastSeen < cutoff)
    .map(([studentId]) => studentId);

  if (lapsedIds.length === 0) return NextResponse.json({ sent: 0 });

  const { data: students } = await admin
    .from("profiles")
    .select("id, full_name, email, last_winback_sent_at")
    .in("id", lapsedIds)
    .or(`last_winback_sent_at.is.null,last_winback_sent_at.lt.${cutoff}`);

  if (!students || students.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const errors: string[] = [];

  for (const student of students) {
    if (student.email) {
      const firstName = (student.full_name ?? "there").split(" ")[0];
      const { error } = await resend.emails.send({
        from: `[Studio Name] <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: student.email,
        subject: "We miss you!",
        html: buildWinbackEmailHtml(firstName),
      }).catch((e) => ({ error: e }));
      if (error) errors.push(`${student.email}: ${error.message ?? error}`);
      else sent++;
    }
    await admin.from("profiles").update({ last_winback_sent_at: new Date().toISOString() }).eq("id", student.id);
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
