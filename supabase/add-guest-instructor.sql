-- Lets an instructor credit a guest teacher who doesn't have a VIA account,
-- e.g. displayed to clients as "w/ Luji X Brenda".
alter table public.classes
  add column if not exists guest_instructor_name text;
