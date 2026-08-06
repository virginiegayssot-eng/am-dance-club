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
