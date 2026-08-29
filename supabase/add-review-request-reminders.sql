-- Automatic first-timer review-request emails, same pattern as the other
-- three automatic reminders in add-reminders.sql / add-birthday-reminders.sql.
-- Run this in the Supabase SQL editor, then edit and run the cron.schedule
-- block at the bottom (needs your real app URL and CRON_SECRET — reuse the
-- same CRON_SECRET already set for the other reminders).
--
-- Does NOT change the existing manual tools — "First-timers by class" and
-- "Any members" in Marketing > Review Requests keep working exactly as
-- before. This adds a second, automatic path for the first-timer case only.

alter table public.attendance
  add column if not exists review_email_sent_at timestamptz;

alter table public.reminder_settings
  add column if not exists review_request_reminders_enabled boolean not null default true;

-- Unlike the other three reminders, this one needs to land the SAME DAY as
-- the class (the email text says "this morning") — not the next morning.
-- THE A.M's only class is Friday 7am, so this fires Friday 8am Sydney, an
-- hour after class starts (Thursday 22:00 UTC = Friday 8am AEST — during
-- AEDT this drifts to 9am, same DST caveat as the other jobs). A future
-- client with a different class day/time needs its own hour + day-of-week
-- here, not a copy-paste of THE A.M's.
select cron.schedule(
  'send-review-request-emails',
  '0 22 * * 4',
  $$
  select net.http_post(
    url := 'https://YOUR_APP_URL/api/reminders/review-request',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
