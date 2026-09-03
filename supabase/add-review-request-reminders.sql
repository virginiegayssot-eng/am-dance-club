-- Automatic review-request email, sent ~1 hour after a first-time
-- attendee's class ends (checked every 15 minutes against each class's
-- real start/end time, in Sydney time, inside the API route itself — this
-- is not a single fixed daily send time, since BYLA runs classes on
-- multiple different days/times, unlike THE A.M's one-class-a-week
-- schedule). Run this in the Supabase SQL editor, then edit and run the
-- cron.schedule block at the bottom with your real app URL and CRON_SECRET.

alter table public.attendance
  add column if not exists review_reminder_sent_at timestamptz;

-- Single-row switch so an admin can pause this from Marketing > Reminders
-- without touching the cron schedule or code.
create table if not exists public.reminder_settings (
  id int primary key default 1,
  review_request_reminders_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint reminder_settings_singleton check (id = 1)
);
insert into public.reminder_settings (id) values (1) on conflict (id) do nothing;

alter table public.reminder_settings enable row level security;
drop policy if exists "Instructors can view reminder settings" on public.reminder_settings;
create policy "Instructors can view reminder settings" on public.reminder_settings
  for select using (auth.uid() in (select id from public.profiles where role = 'instructor'));
drop policy if exists "Admins can update reminder settings" on public.reminder_settings;
create policy "Admins can update reminder settings" on public.reminder_settings
  for update using (auth.uid() in (select id from public.profiles where role = 'instructor' and is_admin = true));

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Runs every 15 minutes so the ~1-hour-after-class window (checked
-- precisely inside the API route) is caught promptly regardless of which
-- day/time a class runs — the API route itself only sends once per
-- attendance row, tracked via review_reminder_sent_at.
select cron.schedule(
  'send-review-request-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_APP_URL/api/reminders/review-request',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
