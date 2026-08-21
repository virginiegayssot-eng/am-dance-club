-- Run this ONCE on the demo Supabase project you already set up (Project ID
-- viavfgvkvlgxycniinae). It tops up what you seeded before — updated,
-- market-rate pricing instead of THE A.M's real prices, more class variety,
-- and a second (fake) instructor so the studio doesn't look like a
-- one-person show. Safe to paste as a single block into the SQL Editor.

-- ---- 1. Update pricing (was showing THE A.M's actual prices) ----
update public.pass_types set price_cents = 3200, description = 'Drop-in, one class' where id = 'casual';
update public.pass_types set price_cents = 5800, description = 'Two spots in the same class' where id = 'double';
update public.pass_types set price_cents = 5900, validity_days = 60, description = '3 classes for new students — valid 2 months' where id = 'intro';
update public.pass_types set price_cents = 14500, description = 'Valid for 6 months' where id = 'five';
update public.pass_types set price_cents = 26500, description = 'Valid for 1 year' where id = 'ten';

-- ---- 2. Second instructor: Jordan Reyes ----
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

-- Attribute the classes you already seeded to Jordan too, so it doesn't
-- look like an unstaffed studio.
update public.classes set instructor_id = (select id from public.profiles where email = 'jordan@example.com')
  where title = 'Beginners Flow' and instructor_id is null;

-- ---- 3. New class types, taught by Jordan ----
insert into public.classes (title, description, location, class_date, class_time, duration_minutes, capacity, price_cents, instructor_id) values
  ('Strength Foundations', 'Build strength the smart way with simple, effective movement patterns.', '123 Example Street, Sydney NSW 2000', '2026-08-24', '18:00', 60, 18, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Strength Foundations', 'Build strength the smart way with simple, effective movement patterns.', '123 Example Street, Sydney NSW 2000', '2026-08-31', '18:00', 60, 18, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Strength Foundations', 'Build strength the smart way with simple, effective movement patterns.', '123 Example Street, Sydney NSW 2000', '2026-09-07', '18:00', 60, 18, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Power Hour', 'A high-energy, full-body session to get your heart rate up and build strength fast.', '123 Example Street, Sydney NSW 2000', '2026-08-26', '18:00', 45, 20, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Power Hour', 'A high-energy, full-body session to get your heart rate up and build strength fast.', '123 Example Street, Sydney NSW 2000', '2026-09-02', '18:00', 45, 20, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Power Hour', 'A high-energy, full-body session to get your heart rate up and build strength fast.', '123 Example Street, Sydney NSW 2000', '2026-09-09', '18:00', 45, 20, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Restore & Stretch', 'Slow it down with guided stretching and mobility work. Great for recovery days.', '123 Example Street, Sydney NSW 2000', '2026-08-29', '10:00', 45, 15, 3200, (select id from public.profiles where email = 'jordan@example.com')),
  ('Restore & Stretch', 'Slow it down with guided stretching and mobility work. Great for recovery days.', '123 Example Street, Sydney NSW 2000', '2026-09-05', '10:00', 45, 15, 3200, (select id from public.profiles where email = 'jordan@example.com'));

-- ---- 4. Bump the guest workshop price to match the new pricing tier ----
update public.classes set price_cents = 4500 where title = 'Guest Instructor Workshop';

-- After this, sign up in the app with your own email (if you haven't
-- already) and run:
-- update public.profiles set role = 'instructor' where email = 'you@example.com';
-- to become a second real instructor alongside Jordan. There's no
-- "reassign instructor" button on existing classes in this build, but
-- creating a brand new class from your dashboard will list you as the
-- instructor automatically — good one to show off live.
