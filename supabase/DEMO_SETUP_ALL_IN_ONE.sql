-- ============================================================
-- SABLE STUDIO DEMO — full schema, run once in a brand-new
-- Supabase project's SQL Editor. Combines schema.sql + every
-- migration on the template branch, in dependency order.
-- ============================================================

-- ---- schema.sql ----
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
  location text not null default '[Studio Location]',
  class_date date not null,
  class_time time not null default '07:00',
  duration_minutes int not null default 60,
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
  video_type text not null default 'youtube' check (video_type in ('youtube', 'r2')),
  youtube_url text,
  youtube_id text,
  r2_key text,
  file_size_bytes bigint,
  class_id uuid references public.classes(id) on delete set null,
  is_public boolean default false,
  created_at timestamptz default now(),
  constraint videos_source_matches_type check (
    (video_type = 'youtube' and youtube_id is not null) or
    (video_type = 'r2' and r2_key is not null)
  )
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
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: get registered student count per class
create or replace view public.class_registration_counts as
  select class_id, count(*) as registered_count
  from public.registrations
  where status = 'confirmed'
  group by class_id;

-- ---- passes-schema.sql ----
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

insert into public.pass_types values
  ('casual',    'Casual Class',   'Drop-in, one class',                         1,   2400, null, 0, false),
  ('double',    'Double Pass',    'Two spots in the same class',                 1,   3800, null, 1, false),
  ('intro',     'Intro Pass',     '3 classes for new students — valid 3 months', 3,   3900, 90,  0, true),
  ('five',      '5-Class Pass',   'Valid for 6 months',                          5,  10000, 180, 0, false),
  ('ten',       '10-Class Pass',  'Valid for 1 year',                            10, 20000, 365, 0, false);

alter table public.pass_types enable row level security;
create policy "Pass types viewable by authenticated users" on public.pass_types
  for select using (auth.role() = 'authenticated');
create policy "Instructors can manage pass types" on public.pass_types
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- Student passes (purchased)
create table public.passes (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade,
  pass_type_id text references public.pass_types(id),
  classes_total int not null,
  classes_remaining int not null,
  expires_at timestamptz,
  stripe_session_id text,
  source text,               -- 'stripe' | 'cash' | 'card_manual' | 'complimentary'
  amount_paid_cents int,
  created_at timestamptz default now()
);

alter table public.passes enable row level security;
create policy "Students view own passes" on public.passes
  for select using (auth.uid() = student_id);
create policy "Instructors view all passes" on public.passes
  for select using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
-- No client-writable insert/update policy: every pass write in the app goes
-- through the service-role admin client (webhook, instructor tools), which
-- bypasses RLS regardless. A "using (true)" policy here would just be an
-- unused door open to any signed-in user.

-- Update registrations table to track pass usage and guests
alter table public.registrations
  add column if not exists pass_id uuid references public.passes(id),
  add column if not exists guest_count int not null default 0,
  add column if not exists payment_type text not null default 'casual'
    check (payment_type in ('casual', 'pass', 'double', 'complimentary'));

-- Update attendance to support guest tracking
alter table public.attendance
  add column if not exists guest_attended boolean default false;

-- ---- chat-profile-schema.sql ----
-- Run this AFTER schema.sql and passes-schema.sql

-- Add phone and birth_date to profiles
alter table public.profiles
  add column if not exists phone text,
  add column if not exists birth_date date;

-- Messages (group chat + DMs)
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  recipient_id uuid references public.profiles(id) on delete cascade, -- null = group chat
  channel text not null default 'group' check (channel in ('group', 'direct')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

-- Group messages: any authenticated user can read/write
create policy "Authenticated users can read group messages" on public.messages
  for select using (auth.role() = 'authenticated' and channel = 'group');

create policy "Authenticated users can send group messages" on public.messages
  for insert with check (auth.role() = 'authenticated' and channel = 'group' and auth.uid() = sender_id);

-- Direct messages: only sender or recipient can read
create policy "Users can read their own DMs" on public.messages
  for select using (
    channel = 'direct' and (
      auth.uid() = sender_id or auth.uid() = recipient_id
    )
  );

create policy "Users can send DMs" on public.messages
  for insert with check (
    channel = 'direct' and auth.uid() = sender_id
  );

create policy "Users can mark their received DMs as read" on public.messages
  for update using (
    channel = 'direct' and auth.uid() = recipient_id
  );

-- Enable realtime on messages
alter publication supabase_realtime add table public.messages;

-- Unread count helper view
create or replace view public.unread_dm_counts as
  select recipient_id, count(*) as unread_count
  from public.messages
  where channel = 'direct' and read_at is null
  group by recipient_id;

-- Unused by the app today, but lock it down rather than leave it bypassing RLS
alter view public.unread_dm_counts set (security_invoker = true);

-- ---- add-playlists-discounts-walkins.sql ----
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

-- ---- add-news-and-likes.sql ----
-- Run this AFTER chat-profile-schema.sql (message_likes references messages)

-- Announcements / news board shown on the student dashboard
create table public.news_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  category text not null default 'general' check (category in ('general', 'location', 'event', 'routine')),
  pinned boolean not null default false,
  created_at timestamptz default now()
);

alter table public.news_posts enable row level security;
create policy "News posts viewable by authenticated users" on public.news_posts
  for select using (auth.role() = 'authenticated');
create policy "Instructors can manage news posts" on public.news_posts
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- Likes on chat messages
create table public.message_likes (
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

alter table public.message_likes enable row level security;
create policy "Authenticated users can view likes" on public.message_likes
  for select using (auth.role() = 'authenticated');
create policy "Users can like messages" on public.message_likes
  for insert with check (auth.uid() = user_id);
create policy "Users can unlike their own likes" on public.message_likes
  for delete using (auth.uid() = user_id);

-- ---- add-news-post-image.sql ----
-- Lets an announcement/news post optionally include an image.

alter table public.news_posts add column image_url text;

-- ---- add-merch.sql ----
-- Merch: products + orders (direct per-client Stripe, no Connect)

create table public.merch_products (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  price_cents int not null,
  image_url text,
  sizes text[],
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.merch_products enable row level security;
create policy "Active products viewable by authenticated users" on public.merch_products
  for select using (auth.role() = 'authenticated' and active = true);
create policy "Instructors can view all products" on public.merch_products
  for select using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
create policy "Instructors can manage products" on public.merch_products
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

create table public.merch_orders (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.merch_products(id) on delete set null,
  student_id uuid references public.profiles(id) on delete cascade,
  size text,
  amount_paid_cents int,
  stripe_session_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz default now()
);

alter table public.merch_orders enable row level security;
create policy "Students view own orders" on public.merch_orders
  for select using (auth.uid() = student_id);
create policy "Students create own orders" on public.merch_orders
  for insert with check (auth.uid() = student_id);
create policy "Instructors view all orders" on public.merch_orders
  for select using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- Example product so /merch isn't empty out of the box — edit or delete
-- this from the instructor dashboard's Merch tab once real products are ready.
insert into public.merch_products (title, description, price_cents, sizes, active) values
  ('Studio T-Shirt', 'Soft cotton tee with the studio logo. Example product — edit me from the instructor dashboard.', 3000, array['S', 'M', 'L', 'XL'], true);

-- ---- add-special-class-flag.sql ----
-- Lets a one-off class (a pop-up, collab, or guest class at a different location/date
-- outside the regular recurring schedule) be flagged and labeled so it stands out
-- on the booking page instead of blending in with the regular weekly classes.

alter table public.classes add column is_special boolean not null default false;
alter table public.classes add column special_label text;

-- ---- add-class-duration-options.sql ----
-- Optional second duration/price tier per class (e.g. Sneakers: 60min $25 or 90min $30)
-- Null on both columns means the class only offers its single default duration_minutes/price_cents.

alter table public.classes add column alt_duration_minutes int;
alter table public.classes add column alt_price_cents int;

-- ---- add-video-r2-support.sql ----
-- Cloudflare R2-hosted videos, alongside existing YouTube-embedded ones.
alter table public.videos
  add column if not exists video_type text not null default 'youtube' check (video_type in ('youtube', 'r2')),
  add column if not exists r2_key text,
  add column if not exists file_size_bytes bigint,
  alter column youtube_url drop not null,
  alter column youtube_id drop not null;

alter table public.videos
  drop constraint if exists videos_source_matches_type;
alter table public.videos
  add constraint videos_source_matches_type check (
    (video_type = 'youtube' and youtube_id is not null) or
    (video_type = 'r2' and r2_key is not null)
  );

-- ---- add-chat-image-support.sql ----
-- Lets a chat message optionally carry an image (community corner posts, etc.)
-- Null means a text-only message, same as today.

alter table public.messages add column image_url text;

-- ---- add-pass-payment-tracking.sql ----
-- The webhook and manual "assign pass" routes have always inserted a
-- `source` and `amount_paid_cents` value on every pass, and Reports has
-- always read them back (payment-type breakdown, revenue totals), but
-- passes-schema.sql never actually defined these columns. Every pass
-- insert that included them was silently failing (Postgres rejects an
-- insert referencing an unknown column), so no pass ever got created,
-- even though the webhook still returned 200 to Stripe.

alter table public.passes
  add column if not exists source text,
  add column if not exists amount_paid_cents int;

-- ---- add-filming-policy-consent.sql ----
-- Records when a member ticked the "I've read the Filming & Photography
-- Policy" checkbox at signup, so there's an accessible record of consent
-- (queryable straight from the profiles table) rather than just a client-
-- side checkbox that leaves no trace.
alter table public.profiles
  add column if not exists filming_policy_accepted_at timestamptz;

-- ---- fix-security-advisor-warnings.sql ----
-- Fixes for Supabase Security Advisor warnings (not errors — lower priority,
-- run this whenever things are quiet).

-- 1. "Function Search Path Mutable" on handle_new_user — this trigger fires
--    on every signup. Pin its search_path so it can't be hijacked by an
--    object created earlier in the search path.
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
$$ language plpgsql security definer set search_path = public;

-- 2. "RLS Policy Always True" (x2) on passes — nothing in the app writes to
--    passes from the client; every insert/update goes through the
--    service-role admin client, which bypasses RLS regardless. These
--    policies are just an unused door open to any signed-in user.
drop policy if exists "System can insert passes" on public.passes;
drop policy if exists "System can update passes" on public.passes;

-- 3. "Leaked Password Protection Disabled" isn't fixable via SQL — enable it
--    in the Supabase dashboard: Authentication -> Policies (or Providers) ->
--    Password -> turn on "Leaked password protection". Safe to flip anytime.

