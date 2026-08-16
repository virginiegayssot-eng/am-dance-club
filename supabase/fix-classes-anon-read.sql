-- Fixes the public /classes page (and any shared class link) showing
-- "No upcoming classes" for anyone who isn't logged in.
--
-- Root cause: the only SELECT policy on public.classes was
-- `using (auth.role() = 'authenticated')` — it silently returns zero rows
-- for an anonymous request, not an error. /classes is linked in Navbar for
-- logged-out visitors too, so a shared link (Instagram, etc.) to someone
-- with no account gets an empty list no matter which class it points at.
--
-- This adds an EXTRA permissive policy rather than editing the existing
-- one — Postgres OKs multiple permissive policies for the same command
-- (they combine with OR), so authenticated users keep seeing everything
-- they already could (including cancelled classes), and now everyone else
-- can additionally see non-cancelled ones.
--
-- Deliberately doesn't touch `profiles` (has email/phone/birth_date — real
-- PII, and RLS can't scope by column, only by row) — anonymous visitors
-- just won't see the "w/ InstructorName" badge on the public classes page.
-- The classes page already handles a missing/empty instructor lookup
-- gracefully, so this doesn't need any app-code change to be safe.
--
-- Safe to re-run.

drop policy if exists "Non-cancelled classes are publicly viewable" on public.classes;
create policy "Non-cancelled classes are publicly viewable" on public.classes
  for select using (is_cancelled = false);
