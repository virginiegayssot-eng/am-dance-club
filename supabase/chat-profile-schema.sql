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
