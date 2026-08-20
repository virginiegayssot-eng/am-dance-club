-- Records when a member ticked the "I've read the Filming & Photography
-- Policy" checkbox at signup, so there's an accessible record of consent
-- (queryable straight from the profiles table) rather than just a client-
-- side checkbox that leaves no trace.
alter table public.profiles
  add column if not exists filming_policy_accepted_at timestamptz;
