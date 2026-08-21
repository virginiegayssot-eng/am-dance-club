-- Run this AFTER schema.sql

-- Add bio and title to profiles (instructor profile display on /instructors)
alter table public.profiles
  add column if not exists title text,
  add column if not exists bio text;
