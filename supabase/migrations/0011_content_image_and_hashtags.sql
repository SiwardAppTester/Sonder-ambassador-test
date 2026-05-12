-- Sonder Ambassador feature — Campaign content image_url + campaign hashtags.
--
-- Two additive columns, same motivation as 0010 (rewards.image_url):
-- enable seed / external-URL imagery without uploading to the private
-- `ambassador-media` storage bucket, and surface hashtags on the campaign
-- row so the mobile UI's "Tags" line has something to render.
--
-- Mobile mappers prefer the explicit *_url column when present; the
-- existing storage-path columns remain authoritative for admin uploads.

alter table public.campaign_contents
  add column if not exists image_url text;

alter table public.campaigns
  add column if not exists hashtags text[] not null default '{}';
