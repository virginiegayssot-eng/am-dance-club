-- Automatic class reminders (12 hours before a confirmed booking) and
-- win-back emails (students who haven't attended in 3+ weeks).
-- Run this in the Supabase SQL editor, then edit and run the cron.schedule
-- block at the bottom (it needs your real app URL and CRON_SECRET filled in).

alter table public.registrations
  add column if not exists reminder_sent_at timestamptz;

alter table public.profiles
  add column if not exists last_winback_sent_at timestamptz;

-- Single-row switch so an admin can pause either reminder type from the
-- Reports > Settings tab without touching the cron schedule or code.
create table if not exists public.reminder_settings (
  id int primary key default 1,
  booking_reminders_enabled boolean not null default true,
  winback_reminders_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint reminder_settings_singleton check (id = 1)
);
insert into public.reminder_settings (id) values (1) on conflict (id) do nothing;

alter table public.reminder_settings enable row level security;
create policy "Instructors can view reminder settings" on public.reminder_settings
  for select using (auth.uid() in (select id from public.profiles where role = 'instructor'));
create policy "Admins can update reminder settings" on public.reminder_settings
  for update using (auth.uid() in (select id from public.profiles where role = 'instructor' and is_admin = true));

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Booking reminders: runs every 15 minutes so the 12-hour mark is caught
-- promptly (the API route itself only sends once per registration).
select cron.schedule(
  'send-booking-reminders',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_APP_URL/api/reminders/booking',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);

-- Win-back emails: once a day is plenty for a 3-week window.
select cron.schedule(
  'send-winback-emails',
  '0 20 * * *', -- 8pm UTC = 6/7am Sydney, depending on DST
  $$
  select net.http_post(
    url := 'https://YOUR_APP_URL/api/reminders/winback',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
