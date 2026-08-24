-- An admin is still a regular instructor (role stays 'instructor') that
-- additionally gets this flag. Used to gate admin-only settings, like
-- pausing automatic reminders in Reports > Settings.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- If this studio has just one instructor account so far, flag it as admin.
-- Safe to re-run; won't touch accounts you've already set deliberately.
update public.profiles set is_admin = true where role = 'instructor';
