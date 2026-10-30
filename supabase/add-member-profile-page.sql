-- Run once against BYLA's real Supabase project.

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

-- Note: unlike THE A.M, BYLA already has passes.source/amount_paid_cents
-- (passes-schema.sql + add-pass-payment-tracking.sql), so nothing else is
-- needed here.
