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
