-- Web push subscriptions, one row per browser/device a member has opted in on.
create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users can read their own push subscriptions" on public.push_subscriptions
  for select using (auth.uid() = student_id);

create policy "Users can add their own push subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = student_id);

create policy "Users can remove their own push subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = student_id);

create index push_subscriptions_student_id_idx on public.push_subscriptions(student_id);
