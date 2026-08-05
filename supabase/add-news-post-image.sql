-- Lets an announcement/news post optionally include an image.

alter table public.news_posts add column image_url text;
