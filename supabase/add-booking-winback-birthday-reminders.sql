-- Automatic booking reminders (~12h before a confirmed class), win-back
-- emails (students inactive 3+ weeks), and birthday emails. Reuses the
-- reminder_settings table and CRON_SECRET already set up by
-- add-review-request-reminders.sql. Run this in the Supabase SQL editor,
-- then edit and run the three cron.schedule blocks at the bottom with your
-- real app URL and CRON_SECRET (same one you already used for review
-- requests).

alter table public.registrations
  add column if not exists reminder_sent_at timestamptz;

alter table public.profiles
  add column if not exists last_winback_sent_at timestamptz;

alter table public.profiles
  add column if not exists last_birthday_email_sent_at timestamptz;

alter table public.reminder_settings
  add column if not exists booking_reminders_enabled boolean not null default true;
alter table public.reminder_settings
  add column if not exists winback_reminders_enabled boolean not null default true;
alter table public.reminder_settings
  add column if not exists birthday_reminders_enabled boolean not null default true;

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

-- Birthday emails: same daily cadence as win-back.
select cron.schedule(
  'send-birthday-emails',
  '0 20 * * *', -- 8pm UTC = 6/7am Sydney, depending on DST
  $$
  select net.http_post(
    url := 'https://YOUR_APP_URL/api/reminders/birthday',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
    body := '{}'::jsonb
  );
  $$
);
