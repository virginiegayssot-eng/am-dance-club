-- Lets merch product images be uploaded from the instructor's phone/photo
-- library instead of typing an image URL, same pattern as news post images
-- (see add-news-post-image.sql + /api/instructor/upload-news-image).
-- Creates a public storage bucket that /api/instructor/upload-merch-image
-- writes to with the service role key (bypasses RLS on upload), plus a
-- public-read policy so product photos actually render on the public
-- /merch page.

insert into storage.buckets (id, name, public)
values ('merch-images', 'merch-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read access to merch images" on storage.objects;
create policy "Public read access to merch images"
  on storage.objects for select
  using (bucket_id = 'merch-images');
