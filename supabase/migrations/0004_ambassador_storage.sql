-- Sonder Ambassador feature — storage buckets and policies
--
--   * `ambassador-media`  — PRIVATE. Holds campaign covers + campaign content
--                           (images, videos). Served via signed URLs.
--   * `reward-images`     — PUBLIC. Holds reward catalog images.
--
-- Path convention: `{organization_id}/{entity}/{uuid}.{ext}`. RLS policies
-- below enforce this — uploads outside the caller's org_id prefix are denied.

-- ─────────────────────────────────────────────────────────────────────────
-- Buckets
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ambassador-media', 'ambassador-media', false,
  104857600,  -- 100 MB; per-asset client/server validation tightens this
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reward-images', 'reward-images', true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────
-- Helper: extract the org_id prefix from a storage path
-- Path layout: '{org_id}/...' → first segment is the UUID.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.storage_path_org_id(p_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      then split_part(p_name, '/', 1)::uuid
    else null
  end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- ambassador-media policies
-- Read:   members of the org with `ambassador.campaign.view`.
-- Write:  members of the org with `ambassador.campaign.manage`.
-- Update/Delete: same as write (admin can replace/remove).
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "ambassador-media read"   on storage.objects;
drop policy if exists "ambassador-media write"  on storage.objects;
drop policy if exists "ambassador-media update" on storage.objects;
drop policy if exists "ambassador-media delete" on storage.objects;

create policy "ambassador-media read"
  on storage.objects for select
  using (
    bucket_id = 'ambassador-media'
    and public.caller_has_permission(public.storage_path_org_id(name), 'ambassador.campaign.view')
  );

create policy "ambassador-media write"
  on storage.objects for insert
  with check (
    bucket_id = 'ambassador-media'
    and public.caller_has_permission(public.storage_path_org_id(name), 'ambassador.campaign.manage')
  );

create policy "ambassador-media update"
  on storage.objects for update
  using (
    bucket_id = 'ambassador-media'
    and public.caller_has_permission(public.storage_path_org_id(name), 'ambassador.campaign.manage')
  );

create policy "ambassador-media delete"
  on storage.objects for delete
  using (
    bucket_id = 'ambassador-media'
    and public.caller_has_permission(public.storage_path_org_id(name), 'ambassador.campaign.manage')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- reward-images policies
-- Public read (the bucket is `public = true`, but we still need an explicit
-- SELECT policy on storage.objects).
-- Write/Update/Delete: members with `ambassador.reward.manage`.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "reward-images read"   on storage.objects;
drop policy if exists "reward-images write"  on storage.objects;
drop policy if exists "reward-images update" on storage.objects;
drop policy if exists "reward-images delete" on storage.objects;

create policy "reward-images read"
  on storage.objects for select
  using (bucket_id = 'reward-images');

create policy "reward-images write"
  on storage.objects for insert
  with check (
    bucket_id = 'reward-images'
    and public.caller_has_permission(public.storage_path_org_id(name), 'ambassador.reward.manage')
  );

create policy "reward-images update"
  on storage.objects for update
  using (
    bucket_id = 'reward-images'
    and public.caller_has_permission(public.storage_path_org_id(name), 'ambassador.reward.manage')
  );

create policy "reward-images delete"
  on storage.objects for delete
  using (
    bucket_id = 'reward-images'
    and public.caller_has_permission(public.storage_path_org_id(name), 'ambassador.reward.manage')
  );
