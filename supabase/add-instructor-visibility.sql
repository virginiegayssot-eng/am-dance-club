-- Lets an instructor account (e.g. an admin covering for the real
-- instructors) keep full dashboard/RLS access without appearing on the
-- public /instructors page.
alter table public.profiles
  add column if not exists show_on_instructors_page boolean not null default true;
