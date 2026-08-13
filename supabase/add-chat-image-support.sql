-- Lets a chat message optionally carry an image (community corner posts, etc.)
-- Null means a text-only message, same as today.

alter table public.messages add column if not exists image_url text;
