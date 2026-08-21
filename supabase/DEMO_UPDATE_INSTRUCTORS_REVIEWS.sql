-- Run this ONCE on the demo Supabase project you already set up (Project ID
-- viavfgvkvlgxycniinae), alongside DEMO_UPDATE_PRICING_AND_CLASSES.sql.
-- Adds: the fix so logged-out visitors can browse /classes, the public
-- /instructors bios page + reviews carousel tables, and a bio + a couple of
-- sample reviews so neither page looks empty during a pitch.

-- ---- 1. Anonymous class browsing ----
drop policy if exists "Non-cancelled classes are publicly viewable" on public.classes;
create policy "Non-cancelled classes are publicly viewable" on public.classes
  for select using (is_cancelled = false);

-- ---- 2. Instructor bio fields + visibility flag ----
alter table public.profiles
  add column if not exists title text,
  add column if not exists bio text;

alter table public.profiles
  add column if not exists show_on_instructors_page boolean not null default true;

drop view if exists public.public_instructors;
create view public.public_instructors as
  select id, full_name, avatar_url, title, bio
  from public.profiles
  where role = 'instructor' and show_on_instructors_page = true;

grant select on public.public_instructors to anon, authenticated;

-- ---- 3. Reviews table ----
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  student_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'approved' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

create unique index if not exists reviews_one_per_student
  on public.reviews (student_id) where student_id is not null;

alter table public.reviews enable row level security;

drop policy if exists "Approved reviews are publicly viewable" on public.reviews;
create policy "Approved reviews are publicly viewable" on public.reviews
  for select using (status = 'approved');

drop policy if exists "Members can view their own review" on public.reviews;
create policy "Members can view their own review" on public.reviews
  for select using (auth.uid() = student_id);

drop policy if exists "Instructors can manage reviews" on public.reviews;
create policy "Instructors can manage reviews" on public.reviews
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- ---- 4. Give Jordan a bio so /instructors isn't blank ----
update public.profiles
set title = 'Lead Instructor',
    bio = 'Jordan has been teaching movement classes for over eight years and loves helping first-timers feel at home in the room.'
where email = 'jordan@example.com';

-- ---- 5. A couple of sample reviews for the homepage carousel ----
insert into public.reviews (author_name, rating, review_text, status) values
  ('Emma T.', 5, 'Such a welcoming space — I was nervous as a complete beginner and left feeling like part of the community already.', 'approved'),
  ('Chris P.', 5, 'Jordan is a brilliant instructor. Classes are structured but still really fun. Highly recommend the 10-class pass.', 'approved');

-- After this, sign up in the app with your own email (if you haven't
-- already), promote yourself to instructor, then set your own bio from the
-- Instructors tab in your dashboard.
