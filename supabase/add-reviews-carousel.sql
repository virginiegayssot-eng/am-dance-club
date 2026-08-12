-- Google review carousel shown on the public homepage. Curated manually by
-- admins rather than pulled live from Google (avoids API billing setup and
-- Google's display/caching restrictions). Publicly viewable — including
-- logged-out visitors — since this is marketing content on the homepage,
-- not member-only content.
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  review_text text not null,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Reviews are publicly viewable" on public.reviews
  for select using (true);

create policy "Admins can manage reviews" on public.reviews
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor' and is_admin = true)
  );
