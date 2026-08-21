-- SABLE STUDIO DEMO — sample data so the app looks alive during a pitch.
-- Run this AFTER DEMO_SETUP_ALL_IN_ONE.sql.
--
-- Classes are left with no instructor assigned. After you sign up in the
-- app once (as yourself), run the one-liner at the bottom to make that
-- account an instructor — then use "Assign instructor" on any class in
-- the dashboard to link yourself, which is worth showing off live anyway.

insert into public.classes (title, description, location, class_date, class_time, duration_minutes, capacity, price_cents) values
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-08-25', '19:00', 60, 15, 2400),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-08-27', '19:00', 60, 15, 2400),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-09-01', '19:00', 60, 15, 2400),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-09-03', '19:00', 60, 15, 2400),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-09-08', '19:00', 60, 15, 2400),
  ('Beginners Flow', 'A relaxed, welcoming intro class. No experience needed.', '123 Example Street, Sydney NSW 2000', '2026-09-10', '19:00', 60, 15, 2400);

-- One-off / special class, shows off the "special" flag and label
insert into public.classes (title, description, location, class_date, class_time, duration_minutes, capacity, price_cents, is_special, special_label) values
  ('Guest Instructor Workshop', 'A one-off session with a guest instructor — bigger routine, extra live music.', '123 Example Street, Sydney NSW 2000', '2026-09-05', '18:30', 90, 25, 3500, true, 'Guest Workshop');

-- Community Corner announcement, shows up on the member dashboard
insert into public.news_posts (title, body, category, pinned) values
  ('Welcome to Sable Studio!', 'So excited to have you here. Book your first class and let''s get moving together.', 'general', true);

-- After you sign up in the app with your own email, run this to become an instructor:
-- update public.profiles set role = 'instructor' where email = 'you@example.com';
