import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildBirthdayEmailHtml } from "@/lib/reminder-email";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Called once a day by pg_cron — see supabase/add-birthday-reminders.sql.
// Emails students whose birth_date's month/day matches today (Sydney time)
// and who haven't already had a birthday email in the last ~300 days —
// birth_date only carries a real month/day (signup stores a placeholder
// year), so this compares that directly rather than parsing it as a Date.
export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = adminClient();

  const { data: settings } = await admin
    .from("reminder_settings")
    .select("birthday_reminders_enabled")
    .eq("id", 1)
    .single();
  if (settings && !settings.birthday_reminders_enabled) {
    return NextResponse.json({ sent: 0, skipped: "disabled" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const sydneyToday = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" }); // YYYY-MM-DD
  const todayMonthDay = sydneyToday.slice(5); // "MM-DD"
  const cutoff = new Date(Date.now() - 300 * 24 * 3_600_000).toISOString();

  const { data: students } = await admin
    .from("profiles")
    .select("id, full_name, email, birth_date, last_birthday_email_sent_at")
    .eq("role", "student")
    .not("birth_date", "is", null)
    .or(`last_birthday_email_sent_at.is.null,last_birthday_email_sent_at.lt.${cutoff}`);

  const todaysBirthdays = (students ?? []).filter(s => s.birth_date?.slice(5) === todayMonthDay);

  if (todaysBirthdays.length === 0) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const errors: string[] = [];

  for (const student of todaysBirthdays) {
    if (student.email) {
      const firstName = (student.full_name ?? "there").split(" ")[0];
      const { error } = await resend.emails.send({
        from: `THE A.M Dance Club <${process.env.RESEND_FROM ?? "onboarding@resend.dev"}>`,
        to: student.email,
        subject: "Happy Birthday from THE A.M! 🎂",
        html: buildBirthdayEmailHtml(firstName),
      }).catch((e) => ({ error: e }));
      if (error) errors.push(`${student.email}: ${error.message ?? error}`);
      else sent++;
    }
    await admin.from("profiles").update({ last_birthday_email_sent_at: new Date().toISOString() }).eq("id", student.id);
  }

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
