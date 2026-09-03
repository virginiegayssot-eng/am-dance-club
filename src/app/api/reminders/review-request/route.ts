import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildReviewEmailHtml } from "@/lib/review-email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Called once a day by pg_cron — see supabase/add-review-request-reminders.sql.
// Automatically asks first-timers for a Google review the morning after their
// first attended class. "First-timer" mirrors the manual review-candidates
// check: a student counts as a first-timer for a given attendance row only
// while they have no OTHER attended=true row — once they've attended a
// second class, any still-unemailed first row is left alone rather than
// emailed late, same as the manual flow would treat it once you re-check.
// The manual "First-timers by class" and "Any members" tools in Marketing
// keep working exactly as before — this is purely an additional automatic
// layer on top of the first-timer case.
//
// class_date is bounded to the last few days on purpose: this query has no
// other time filter, so without it, any attendance row that's ever been
// marked attended=true and never emailed (e.g. old test data, or a backlog
// from before this job was set up, or from a period it was paused) would
// get swept up and emailed the very first time the job runs, with copy
// that says "this morning" about a class that happened months ago. Rows
// older than the window are marked as sent (without sending) so they don't
// linger as permanently-pending and get re-checked forever.
const REVIEW_REQUEST_MAX_AGE_DAYS = 3;

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

  const { data: pending } = await admin
    .from("attendance")
    .select("id, student_id, class_id, classes!inner(class_date), profiles(full_name, email)")
    .eq("attended", true)
    .is("review_email_sent_at", null);

  if (!pending || pending.length === 0) return NextResponse.json({ sent: 0 });

  const cutoffDate = new Date(Date.now() - REVIEW_REQUEST_MAX_AGE_DAYS * 24 * 3_600_000).toISOString().slice(0, 10);

  let sent = 0;
  const errors: string[] = [];

  for (const row of pending as any[]) {
    // Too old to be "this morning" — mark as handled without emailing, so
    // it doesn't come up again on the next run.
    if (row.classes?.class_date && row.classes.class_date < cutoffDate) {
      await admin.from("attendance").update({ review_email_sent_at: new Date().toISOString() }).eq("id", row.id);
      continue;
    }

    const { data: otherAttended } = await admin
      .from("attendance")
      .select("id")
      .eq("student_id", row.student_id)
      .eq("attended", true)
      .neq("class_id", row.class_id)
      .limit(1);

    // Already attended elsewhere — no longer a first-timer for this row.
    // Leave review_email_sent_at null but don't send; this row will never
    // qualify again since they'll always have another attended class now.
    if (otherAttended && otherAttended.length > 0) continue;

    const email = row.profiles?.email;
    if (email) {
      const firstName = (row.profiles?.full_name ?? "dancer").split(" ")[0];
      const { error } = await resend.emails.send({
        from: `THE A.M Dance Club <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: email,
        subject: "How was your first class?",
        html: buildReviewEmailHtml(firstName),
      }).catch((e) => ({ error: e }));
      if (error) errors.push(`${email}: ${error.message ?? error}`);
      else sent++;
    }

    await admin.from("attendance").update({ review_email_sent_at: new Date().toISOString() }).eq("id", row.id);
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
