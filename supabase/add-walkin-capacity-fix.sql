-- Supersedes add-guest-capacity-fix.sql's view (correctly summed
-- registrations' 1 + guest_count, but that migration predates walk_ins and
-- never accounted for them). class_registration_counts still ignored
-- walk_ins entirely — people added straight onto a class's roll on the day
-- (cash/comp attendees with no online booking) — so the Dashboard's "X/Y
-- booked" figure, the public /classes "spots left" calculation, and the
-- online booking capacity check all undercounted any class with walk-in
-- attendees.
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
