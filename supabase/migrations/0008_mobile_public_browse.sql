-- Sonder Ambassador feature — Mobile public-browse layer.
--
-- Adds the minimum needed for the ambassador-facing mobile app (Expo) to
-- read a public catalog of festivals + active campaigns without an
-- authenticated session. Everything here is additive: existing rows get
-- safe defaults, existing policies are untouched, the desktop admin
-- experience is unaffected.
--
-- Three pieces:
--   1. New nullable/defaulted columns on organizations + campaigns so the
--      admin can mark a row "publicly visible" and attach the public-facing
--      metadata the mobile UI displays (image, location). Storage paths
--      stay separate from public image URLs because public assets may live
--      in a different bucket policy in the future.
--   2. New columns on campaigns so a campaign can carry the headline points
--      values shown on Discover (per-share / per-1k-views). These are the
--      *featured* numbers; per-content overrides still live on
--      campaign_contents.
--   3. RLS policies that grant the `anon` role read access ONLY to rows
--      explicitly flagged is_public AND in an active state. Members keep
--      their existing read paths via the policies in 0002.
--
-- Safe to run on a non-empty database: every change is `if not exists`,
-- nothing is dropped, defaults guarantee existing rows pass new checks.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. organizations — public-browse metadata
-- ─────────────────────────────────────────────────────────────────────────

alter table public.organizations
  add column if not exists is_public   boolean not null default false,
  add column if not exists image_url   text,
  add column if not exists location    text,
  add column if not exists description text,
  add column if not exists slug        text;

create unique index if not exists organizations_slug_unique
  on public.organizations(slug)
  where slug is not null;

create index if not exists organizations_public
  on public.organizations(is_public)
  where is_public;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. campaigns — public flag + headline points
-- ─────────────────────────────────────────────────────────────────────────

alter table public.campaigns
  add column if not exists is_public            boolean not null default false,
  add column if not exists points_per_share     integer not null default 0
    check (points_per_share >= 0),
  add column if not exists points_per_1k_views  integer not null default 0
    check (points_per_1k_views >= 0);

create index if not exists campaigns_public_active
  on public.campaigns(is_public, status)
  where is_public and archived_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Anonymous read policies (mobile, unauthenticated)
--
-- These run alongside the existing "by members" policies from 0002 — RLS
-- ORs all permissive policies for the same operation, so admins keep
-- their existing read paths and gain nothing extra here.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "orgs public read"             on public.organizations;
drop policy if exists "campaigns public read"        on public.campaigns;
drop policy if exists "campaign_contents public read" on public.campaign_contents;

create policy "orgs public read"
  on public.organizations
  for select
  to anon, authenticated
  using (is_public = true);

create policy "campaigns public read"
  on public.campaigns
  for select
  to anon, authenticated
  using (
    is_public = true
    and status = 'active'
    and archived_at is null
    and exists (
      select 1
      from public.organizations o
      where o.id = campaigns.organization_id
        and o.is_public = true
    )
  );

create policy "campaign_contents public read"
  on public.campaign_contents
  for select
  to anon, authenticated
  using (
    archived_at is null
    and exists (
      select 1
      from public.campaigns c
      where c.id = campaign_contents.campaign_id
        and c.is_public = true
        and c.status = 'active'
        and c.archived_at is null
    )
  );
