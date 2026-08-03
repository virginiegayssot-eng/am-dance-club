-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'instructor')),
  avatar_url text,
  phone text,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by authenticated users" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Classes
create table public.classes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  location text not null default 'North Steyne Surf Club',
  class_date date not null,
  class_time time not null default '07:00',
  duration_minutes int not null default 45,
  capacity int not null default 20,
  price_cents int not null default 2000,
  stripe_price_id text,
  instructor_id uuid references public.profiles(id),
  is_cancelled boolean default false,
  created_at timestamptz default now()
);

alter table public.classes enable row level security;
create policy "Classes viewable by all authenticated users" on public.classes
  for select using (auth.role() = 'authenticated');
create policy "Instructors can manage classes" on public.classes
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- Registrations
create table public.registrations (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'refunded')),
  stripe_payment_intent_id text,
  amount_paid_cents int,
  created_at timestamptz default now(),
  unique(class_id, student_id)
);

alter table public.registrations enable row level security;
create policy "Students can view own registrations" on public.registrations
  for select using (auth.uid() = student_id);
create policy "Instructors can view all registrations" on public.registrations
  for select using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
create policy "Students can create own registrations" on public.registrations
  for insert with check (auth.uid() = student_id);
create policy "Users can update own registrations" on public.registrations
  for update using (auth.uid() = student_id or
    auth.uid() in (select id from public.profiles where role = 'instructor'));

-- Attendance
create table public.attendance (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  attended boolean default false,
  marked_at timestamptz default now(),
  unique(class_id, student_id)
);

alter table public.attendance enable row level security;
create policy "Instructors manage attendance" on public.attendance
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
create policy "Students view own attendance" on public.attendance
  for select using (auth.uid() = student_id);

-- Videos
create table public.videos (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  youtube_url text not null,
  youtube_id text not null,
  class_id uuid references public.classes(id) on delete set null,
  is_public boolean default false,
  created_at timestamptz default now()
);

alter table public.videos enable row level security;
create policy "Public videos visible to all authenticated users" on public.videos
  for select using (
    is_public = true or
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
create policy "Instructors manage videos" on public.videos
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: get registered student count per class
create or replace view public.class_registration_counts as
  select class_id, count(*) as registered_count
  from public.registrations
  where status = 'confirmed'
  group by class_id;
