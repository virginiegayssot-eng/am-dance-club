-- Extends the admin-curated reviews table (add-reviews-carousel.sql) to also
-- accept reviews submitted directly by members, gated behind an approval
-- step so nothing goes live on the homepage without a human checking it
-- first. Admin-added reviews keep working exactly as before (status
-- defaults to 'approved', student_id stays null).
alter table public.reviews
  add column if not exists student_id uuid references public.profiles(id) on delete cascade,
  add column if not exists status text not null default 'approved' check (status in ('pending', 'approved'));

-- One review per member — resubmitting updates their existing row instead
-- of creating a second one.
create unique index if not exists reviews_one_per_student
  on public.reviews (student_id) where student_id is not null;

-- The public homepage carousel should only ever show approved reviews.
drop policy if exists "Reviews are publicly viewable" on public.reviews;
create policy "Approved reviews are publicly viewable" on public.reviews
  for select using (status = 'approved');

-- Members can see their own review regardless of its approval status, so
-- their dashboard can show "awaiting approval".
create policy "Members can view their own review" on public.reviews
  for select using (auth.uid() = student_id);
