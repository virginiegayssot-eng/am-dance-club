-- Automatic birthday emails, same pattern as booking reminders/win-back in
-- add-reminders.sql. Run this in the Supabase SQL editor, then edit and run
-- the cron.schedule block at the bottom (needs your real app URL and
-- CRON_SECRET — reuse the same CRON_SECRET already set for the other two).

alter table public.profiles
  add column if not exists last_birthday_email_sent_at timestamptz;

alter table public.reminder_settings
  add column if not exists birthday_reminders_enabled boolean not null default true;

select cron.schedule(
  'send-birthday-emails',
  '0 20 * * *', -- 8pm UTC = 6/7am Sydney, depending on DST — same time as win-back
  $$
  select net.http_post(
    url := 'https://YOUR_APP_URL/api/reminders/birthday',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
