-- Cloudflare R2-hosted videos, alongside existing YouTube-embedded ones.
alter table public.videos
  add column if not exists video_type text not null default 'youtube' check (video_type in ('youtube', 'r2')),
  add column if not exists r2_key text,
  add column if not exists file_size_bytes bigint,
  alter column youtube_url drop not null,
  alter column youtube_id drop not null;

alter table public.videos
  drop constraint if exists videos_source_matches_type;
alter table public.videos
  add constraint videos_source_matches_type check (
    (video_type = 'youtube' and youtube_id is not null) or
    (video_type = 'r2' and r2_key is not null)
  );
