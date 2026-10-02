-- class_registration_counts only ever summed the registrations table
-- (1 + guest_count per confirmed booking), completely ignoring walk_ins —
-- people added straight onto a class's roll on the day (cash/comp
-- attendees with no online booking). The Dashboard's "X/Y booked" figure,
-- the public /classes "spots left" calculation, and the online booking
-- capacity check (api/bookings/route.ts) all read this one view, so a
-- morning with several walk-ins showed a booked count well under the real
-- number of people who actually attended.
--
-- Safe to run anytime — this is a view replacement, takes effect
-- immediately with no data migration needed.

create or replace view public.class_registration_counts as
  select
    coalesce(r.class_id, w.class_id) as class_id,
    coalesce(r.reg_count, 0) + coalesce(w.walkin_count, 0) as registered_count
  from
    (select class_id, sum(1 + coalesce(guest_count, 0)) as reg_count
     from public.registrations
     where status = 'confirmed'
     group by class_id) r
  full outer join
    (select class_id, count(*) as walkin_count
     from public.walk_ins
     group by class_id) w
    on r.class_id = w.class_id;
