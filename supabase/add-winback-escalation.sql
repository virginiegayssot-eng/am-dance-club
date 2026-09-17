-- Win-back emails previously re-fired every 21 days forever for anyone who
-- stayed inactive. This tracks how many win-back emails a student has been
-- sent since their last attended class, so the cron route can escalate the
-- gap (21 -> 60 -> 120 days) and then stop entirely instead of nagging
-- indefinitely. Resets to 0 the next time they attend a class and lapse again.
-- demo's cron.schedule calls are commented out (not a live client), so this
-- column has no effect here until reminders are ever actually turned on.

alter table public.profiles
  add column if not exists winback_count int not null default 0;
