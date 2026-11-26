-- Message a Segment sent with no record of who was actually selected or
-- what the result was. This logs every send so the Marketing page can show
-- a history: when, by whom, and the exact per-recipient outcome.

create table if not exists public.broadcast_sends (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  sent_by uuid references public.profiles(id),
  channel text not null check (channel in ('email', 'push')),
  subject text not null,
  message text not null,
  recipient_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0
);

create table if not exists public.broadcast_recipients (
  id uuid primary key default uuid_generate_v4(),
  broadcast_id uuid references public.broadcast_sends(id) on delete cascade not null,
  student_id uuid references public.profiles(id),
  email text,
  full_name text,
  status text not null check (status in ('sent', 'failed')),
  error text
);
create index if not exists broadcast_recipients_broadcast_id_idx on public.broadcast_recipients(broadcast_id);

alter table public.broadcast_sends enable row level security;
drop policy if exists "Instructors manage broadcast sends" on public.broadcast_sends;
create policy "Instructors manage broadcast sends" on public.broadcast_sends
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

alter table public.broadcast_recipients enable row level security;
drop policy if exists "Instructors manage broadcast recipients" on public.broadcast_recipients;
create policy "Instructors manage broadcast recipients" on public.broadcast_recipients
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
