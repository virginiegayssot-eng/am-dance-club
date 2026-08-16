-- Fixes the public /classes page (and any shared class link) showing
-- "No upcoming classes" for anyone who isn't logged in.
--
-- Root cause: the only SELECT policy on public.classes was
-- `using (auth.role() = 'authenticated')` — it silently returns zero rows
-- for an anonymous request, not an error. /classes is linked in Navbar for
-- logged-out visitors too, so this broke both plain browsing and any
-- shared class link for anyone without an account.
--
-- This adds an EXTRA permissive policy rather than editing the existing
-- one — Postgres OKs multiple permissive policies for the same command
-- (they combine with OR), so authenticated users keep seeing everything
-- they already could (including cancelled classes), and everyone else can
-- additionally see non-cancelled ones.
--
-- Deliberately doesn't touch `profiles` (has email/phone — real PII) —
-- anonymous visitors just won't see the "w/ InstructorName" badge on the
-- public classes page. The classes page already handles a missing/empty
-- instructor lookup gracefully, so this doesn't need any app-code change
-- to be safe.
--
-- Same fix already applied on BYLA and Manea (siblings forked from the
-- same template).
--
-- Safe to re-run.

drop policy if exists "Non-cancelled classes are publicly viewable" on public.classes;
create policy "Non-cancelled classes are publicly viewable" on public.classes
  for select using (is_cancelled = false);
