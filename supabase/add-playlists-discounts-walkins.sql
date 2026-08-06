-- Run this AFTER schema.sql and passes-schema.sql (walk_ins references passes)

-- Spotify playlists shown on the Playlists page
create table public.playlists (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  spotify_url text not null,
  spotify_id text not null,
  created_at timestamptz default now()
);

alter table public.playlists enable row level security;
create policy "Playlists viewable by authenticated users" on public.playlists
  for select using (auth.role() = 'authenticated');
create policy "Instructors can manage playlists" on public.playlists
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- Discount codes applied at pass checkout
create table public.discount_codes (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value int not null, -- percentage (0-100) or cents, depending on discount_type
  max_uses int,                -- null = unlimited
  uses_count int not null default 0,
  expires_at timestamptz,      -- null = no expiry
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.discount_codes enable row level security;
create policy "Instructors can manage discount codes" on public.discount_codes
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- Walk-in attendees added to a class roll without a full student account
create table public.walk_ins (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classes(id) on delete cascade not null,
  name text not null,
  payment_type text not null default 'casual',
  pass_id uuid references public.passes(id),
  created_at timestamptz default now()
);

alter table public.walk_ins enable row level security;
create policy "Instructors can manage walk-ins" on public.walk_ins
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
