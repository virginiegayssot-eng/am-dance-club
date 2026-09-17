-- class_registration_counts previously counted registration rows (count(*)),
-- ignoring guest_count entirely -- a member bringing a guest only ever
-- counted as 1 toward capacity even though 2 people actually attend. Now
-- sums real attendees (1 + guest_count per registration) so a class can't
-- silently go over capacity once guest bookings are in use.

create or replace view public.class_registration_counts as
  select class_id, sum(1 + guest_count) as registered_count
  from public.registrations
  where status = 'confirmed'
  group by class_id;
