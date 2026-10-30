-- Run once against THE A.M's real Supabase project.

-- Private, instructor-only notes per member (injuries, preferences, anything
-- not meant for the member themselves to see). Kept in its own table rather
-- than a column on profiles, because profiles' existing "viewable by
-- authenticated users" policy is row-wide — a notes column there would be
-- readable by every signed-in member, not just instructors.
create table if not exists public.member_notes (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  note text,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.member_notes enable row level security;
drop policy if exists "Instructors manage member notes" on public.member_notes;
create policy "Instructors manage member notes" on public.member_notes
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- `passes.source` / `passes.amount_paid_cents` already exist on THE A.M's
-- real project (added via the dashboard at some point, not through a
-- committed migration) — documented here so the repo matches reality and a
-- fresh environment built from these files gets them too.
alter table public.passes add column if not exists source text;
alter table public.passes add column if not exists amount_paid_cents int;

-- Fix: assigning a pass with "Complimentary" as the payment method left
-- amount_paid_cents at the pass type's full price instead of $0 (the amount
-- field is hidden in that form specifically because comp passes aren't
-- paid, so it silently fell back to full price). That overstates revenue
-- anywhere summing amount_paid_cents, including the new member lifetime-value
-- stat. Zero out the ones already affected.
update public.passes set amount_paid_cents = 0
  where source = 'complimentary' and amount_paid_cents is distinct from 0;
