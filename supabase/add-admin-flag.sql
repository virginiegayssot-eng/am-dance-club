-- An admin is still a regular instructor (role stays 'instructor') that
-- additionally gets this flag. Used to gate admin-only settings, like
-- pausing automatic reminders in Reports > Settings.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- THE A.M currently has one instructor account — flag it as admin.
update public.profiles set is_admin = true where role = 'instructor';
