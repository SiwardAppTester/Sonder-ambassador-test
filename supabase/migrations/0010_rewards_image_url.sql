-- Sonder Ambassador feature — Reward image URL passthrough.
--
-- `rewards.image_path` is a storage-bucket path that the admin uploads to
-- via the dashboard; for seed data and any future case where we want to
-- point at an external URL (Unsplash for demos, a CDN, etc.) we need a
-- separate column. Mobile read hooks prefer image_url when present and
-- fall back to resolving image_path via supabase.storage.getPublicUrl.
--
-- Nullable, additive — desktop is unaffected. No data migration needed.

alter table public.rewards
  add column if not exists image_url text;
