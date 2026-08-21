-- Fixes the public /instructors page showing no instructors for anyone who
-- isn't logged in.
--
-- Root cause: same shape as the classes bug (see fix-classes-anon-read.sql)
-- — profiles' only SELECT policy requires auth.role() = 'authenticated', so
-- an anonymous request returns zero rows.
--
-- Unlike classes, we can't just add a second permissive policy here: RLS
-- filters rows, not columns, and profiles holds real PII (email, phone,
-- birth_date). A public policy on the table itself would expose all of
-- that to anyone. Instead, this publishes a curated VIEW containing only
-- the columns the public instructors page actually renders.
--
-- Safe to re-run.

drop view if exists public.public_instructors;
create view public.public_instructors as
  select id, full_name, avatar_url, title, bio
  from public.profiles
  where role = 'instructor' and show_on_instructors_page = true;

grant select on public.public_instructors to anon, authenticated;
