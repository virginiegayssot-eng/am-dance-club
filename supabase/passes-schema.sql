-- Run this AFTER schema.sql

-- Pass types (reference data)
create table public.pass_types (
  id text primary key,
  name text not null,
  description text,
  classes_included int,         -- null = single use (casual/double)
  price_cents int not null,
  validity_days int,            -- null = no expiry
  max_guests int default 0,     -- for double pass
  new_students_only boolean default false
);

-- Pricing: casual/five/ten are real BYLA prices from the brief. double/intro
-- were not specified — estimated, confirm with Majo before going live.
insert into public.pass_types values
  ('casual',    'Casual Class',  'Drop-in, one class',                          1,   2600, null, 0, false),
  ('double',    'Double Pass',   'Two spots in the same class',                 1,   4800, null, 1, false),
  ('intro',     'Intro Pass',    '3 classes for new students — valid 3 months', 3,   6500, 90,  0, true),
  ('five',      '5-Class Pack',  'Valid for 2 months',                          5,  12000, 60,  0, false),
  ('ten',       '10-Class Pack', 'Valid for 1 year',                            10, 22000, 365, 0, false);

-- Student passes (purchased)
create table public.passes (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade,
  pass_type_id text references public.pass_types(id),
  classes_total int not null,
  classes_remaining int not null,
  expires_at timestamptz,
  stripe_session_id text,
  created_at timestamptz default now()
);

alter table public.passes enable row level security;
create policy "Students view own passes" on public.passes
  for select using (auth.uid() = student_id);
create policy "Instructors view all passes" on public.passes
  for select using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
create policy "System can insert passes" on public.passes
  for insert with check (true);
create policy "System can update passes" on public.passes
  for update using (true);

-- Update registrations table to track pass usage and guests
alter table public.registrations
  add column if not exists pass_id uuid references public.passes(id),
  add column if not exists guest_count int not null default 0,
  add column if not exists payment_type text not null default 'casual'
    check (payment_type in ('casual', 'pass', 'double', 'complimentary'));

-- Update attendance to support guest tracking
alter table public.attendance
  add column if not exists guest_attended boolean default false;
