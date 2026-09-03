-- Automatic reminder emails: booking reminders (~12h before a confirmed
-- class), win-back emails (inactive 3+ weeks), birthday emails, and
-- first-timer review requests (~1h after a first-time attendee's class
-- ends). Sets up the tables/columns and the Marketing > Reminders toggle UI.
--
-- demo is a sales/preview branch, not a live client — the cron.schedule
-- calls at the bottom are commented out on purpose so this migration
-- doesn't start sending real emails to whoever signs up on the demo. Run
-- everything above the cron section now so the Reminders tab works and a
-- prospect can see the feature's settings; only uncomment + fill in a real
-- app URL and CRON_SECRET below if you actually want demo to send on a
-- live schedule.

alter table public.registrations
  add column if not exists reminder_sent_at timestamptz;

alter table public.profiles
  add column if not exists last_winback_sent_at timestamptz;

alter table public.profiles
  add column if not exists last_birthday_email_sent_at timestamptz;

alter table public.attendance
  add column if not exists review_reminder_sent_at timestamptz;

-- Single-row switch so any instructor can pause a reminder type from
-- Marketing > Reminders without touching the cron schedule or code. demo
-- has no is_admin column, so (unlike THE A.M/BYLA) this isn't gated to
-- admins — any instructor can toggle it, matching every other Marketing
-- tab here.
create table if not exists public.reminder_settings (
  id int primary key default 1,
  booking_reminders_enabled boolean not null default true,
  winback_reminders_enabled boolean not null default true,
  birthday_reminders_enabled boolean not null default true,
  review_request_reminders_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint reminder_settings_singleton check (id = 1)
);
insert into public.reminder_settings (id) values (1) on conflict (id) do nothing;

alter table public.reminder_settings enable row level security;
drop policy if exists "Instructors can view reminder settings" on public.reminder_settings;
create policy "Instructors can view reminder settings" on public.reminder_settings
  for select using (auth.uid() in (select id from public.profiles where role = 'instructor'));
drop policy if exists "Instructors can update reminder settings" on public.reminder_settings;
create policy "Instructors can update reminder settings" on public.reminder_settings
  for update using (auth.uid() in (select id from public.profiles where role = 'instructor'));

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Uncomment and fill in a real app URL + CRON_SECRET below only if you want
-- demo to actually send these emails on a live schedule. Left disabled by
-- default since demo isn't a live client.

-- select cron.schedule(
--   'send-booking-reminders',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_APP_URL/api/reminders/booking',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- select cron.schedule(
--   'send-winback-emails',
--   '0 20 * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_APP_URL/api/reminders/winback',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- select cron.schedule(
--   'send-birthday-emails',
--   '0 20 * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_APP_URL/api/reminders/birthday',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- select cron.schedule(
--   'send-review-request-reminders',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR_APP_URL/api/reminders/review-request',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
--     body := '{}'::jsonb
--   );
--   $$
-- );
