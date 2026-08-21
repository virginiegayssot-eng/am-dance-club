-- SABLE STUDIO DEMO — sample data so the app looks alive during a pitch.
-- Run this AFTER DEMO_SETUP_ALL_IN_ONE.sql, on a *fresh* demo project.
--
-- If you already ran the old version of this file against a live demo
-- project, don't re-run this one — it will duplicate classes and the
-- welcome post. Use DEMO_UPDATE_PRICING_AND_CLASSES.sql instead, which is
-- written to top up an existing project safely.

-- ---- Second instructor: Jordan Reyes ----
-- Supabase auth accounts are normally created through the signup flow, but
-- we can seed one directly here so the studio doesn't look like a
-- one-person show. The trigger on auth.users (see schema.sql) auto-creates
-- the matching public.profiles row from raw_user_meta_data.full_name.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'jordan@example.com',
  crypt('demo-instructor-only', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Jordan Reyes"}',
  '', '', '', ''
);

update public.profiles set role = 'instructor' where email = 'jordan@example.com';

-- ---- Classes, taught by Jordan ----
insert into public.classes (title, description, location, class_date, class_time, duration_minutes, capacity, price_cents, instructor_id) values
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-08-25', '19:00', 60, 15, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-08-27', '19:00', 60, 15, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-09-01', '19:00', 60, 15, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-09-03', '19:00', 60, 15, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-09-08', '19:00', 60, 15, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-09-10', '19:00', 60, 15, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Strength Foundations', 'Build strength the smart way with simple, effective movement patterns.', '123 Example Street, Sydney NSW 2000', '2026-08-24', '18:00', 60, 18, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Strength Foundations', 'Build strength the smart way with simple, effective movement patterns.', '123 Example Street, Sydney NSW 2000', '2026-08-31', '18:00', 60, 18, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Strength Foundations', 'Build strength the smart way with simple, effective movement patterns.', '123 Example Street, Sydney NSW 2000', '2026-09-07', '18:00', 60, 18, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Power Hour', 'A high-energy, full-body session to get your heart rate up and build strength fast.', '123 Example Street, Sydney NSW 2000', '2026-08-26', '18:00', 45, 20, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Power Hour', 'A high-energy, full-body session to get your heart rate up and build strength fast.', '123 Example Street, Sydney NSW 2000', '2026-09-02', '18:00', 45, 20, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Power Hour', 'A high-energy, full-body session to get your heart rate up and build strength fast.', '123 Example Street, Sydney NSW 2000', '2026-09-09', '18:00', 45, 20, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Restore & Stretch', 'Slow it down with guided stretching and mobility work. Great for recovery days.', '123 Example Street, Sydney NSW 2000', '2026-08-29', '10:00', 45, 15, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Restore & Stretch', 'Slow it down with guided stretching and mobility work. Great for recovery days.', '123 Example Street, Sydney NSW 2000', '2026-09-05', '10:00', 45, 15, 3200, (select id from public.profiles where email = 'jordan@example.com'));

-- One-off / special class, shows off the "special" flag and label. Left
-- unassigned since it's a guest session, not taught by a regular instructor.
insert into public.classes (title, description, location, class_date, class_time, duration_minutes, capacity, price_cents, is_special, special_label) values
  ('Guest Instructor Workshop', 'A one-off session with a guest instructor — bigger routine, extra live music.', '123 Example Street, Sydney NSW 2000', '2026-09-05', '18:30', 90, 25, 4500, true, 'Guest Workshop');

-- Community Corner announcement, shows up on the member dashboard
insert into public.news_posts (title, body, category, pinned) values
  ('Welcome to Sable Studio!', 'So excited to have you here. Book your first class and let''s get moving together.', 'general', true);

-- After you sign up in the app with your own email, run this to become a
-- second instructor account alongside Jordan:
-- update public.profiles set role = 'instructor' where email = 'you@example.com';
-- There's no "reassign instructor" button on existing classes in this build,
-- but that's fine for a demo — once you're an instructor, create a brand
-- new class from the dashboard and it'll list you automatically. That's a
-- good one to show off live: it's how easy it is to get a class on the
-- calendar.
