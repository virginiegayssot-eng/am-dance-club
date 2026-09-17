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

// Escalating win-back schedule: first nudge at 21 days inactive, then longer
// gaps (60, 120 days) rather than re-firing every 21 days forever. Once all
// three have been sent with no return, we stop until they attend again.
const STAGE_GAP_DAYS = [21, 60, 120];

// Called once a day by pg_cron — see supabase/add-reminders.sql.
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

  const studentIds = Array.from(lastSeenByStudent.keys());
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email, last_winback_sent_at, winback_count")
    .in("id", studentIds);

  if (!profiles || profiles.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const errors: string[] = [];
  const now = Date.now();

  for (const student of profiles) {
    const lastSeen = lastSeenByStudent.get(student.id)!;
    let stage = student.winback_count ?? 0;

    // They've attended since their last win-back email — reset the sequence.
    if (stage > 0 && student.last_winback_sent_at && lastSeen > student.last_winback_sent_at) {
      await admin.from("profiles").update({ winback_count: 0 }).eq("id", student.id);
      stage = 0;
    }

    if (stage >= STAGE_GAP_DAYS.length) continue; // already sent the full sequence

    const requiredGapMs = STAGE_GAP_DAYS[stage] * 24 * 3_600_000;
    if (new Date(lastSeen).getTime() >= now - requiredGapMs) continue; // not lapsed enough yet for this stage

    if (student.email) {
      const firstName = (student.full_name ?? "dancer").split(" ")[0];
      const { error } = await resend.emails.send({
        from: `BYLA <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: student.email,
        subject: "We miss you at BYLA!",
        html: buildWinbackEmailHtml(firstName),
      }).catch((e) => ({ error: e }));
      if (error) errors.push(`${student.email}: ${error.message ?? error}`);
      else sent++;
    }
    await admin.from("profiles").update({
      last_winback_sent_at: new Date().toISOString(),
      winback_count: stage + 1,
    }).eq("id", student.id);
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
