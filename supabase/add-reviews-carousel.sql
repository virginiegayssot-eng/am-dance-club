-- Independent, non-Google review system. Members submit a star rating +
-- text review directly from their dashboard; it lands in a "pending" queue
-- until the instructor approves it, at which point it shows in a rotating
-- carousel on the homepage. The instructor can also add reviews manually
-- (e.g. copied from elsewhere) — those insert as already-approved.
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  student_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'approved' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- One review per member — resubmitting updates their existing row instead
-- of creating a second one.
create unique index reviews_one_per_student
  on public.reviews (student_id) where student_id is not null;

alter table public.reviews enable row level security;

-- Public homepage carousel only ever shows approved reviews.
create policy "Approved reviews are publicly viewable" on public.reviews
  for select using (status = 'approved');

-- Members can see their own review regardless of its approval status, so
-- their dashboard can show "awaiting approval".
create policy "Members can view their own review" on public.reviews
  for select using (auth.uid() = student_id);

-- Instructors manage everything (approve/delete/add manual reviews).
create policy "Instructors can manage reviews" on public.reviews
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
