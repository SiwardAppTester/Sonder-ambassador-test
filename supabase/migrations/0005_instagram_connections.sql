-- Sonder Ambassador feature — Instagram Graph API connections + raw posts
--
-- Purpose: store the OAuth result for an ambassador's Instagram account and
-- the raw posts pulled from the Graph API. Distinct from `content_shares`,
-- which is scoped to *campaign content shared by an ambassador* — this table
-- is the firehose of an ambassador's IG output, regardless of campaign.
--
-- Token storage: Phase 1 stores tokens in plaintext, RLS-gated. Service-role
-- only writes; admin-side only reads non-token columns via the
-- `instagram_connections_public` view (no policies on raw token columns are
-- exposed to admins). Encrypt or move to Vault before production rollout.

-- ─────────────────────────────────────────────────────────────────────────
-- instagram_connections
-- One row per (ambassador, connected IG business account). Soft-disconnect
-- via `disconnected_at` so we keep history of who-connected-when.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.instagram_connections (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  ambassador_id             uuid not null references public.ambassadors(id) on delete cascade,
  ig_business_account_id    text not null,
  ig_username               text not null,
  fb_page_id                text not null,
  fb_page_name              text,
  page_access_token         text not null,
  long_lived_user_token     text not null,
  token_expires_at          timestamptz,
  scopes                    text[] not null default '{}',
  connected_at              timestamptz not null default now(),
  disconnected_at           timestamptz,
  last_synced_at            timestamptz,
  last_sync_error           text
);

-- Only one *active* connection per ambassador at a time. A disconnected row
-- can coexist with a new active one (history retained).
create unique index if not exists instagram_connections_unique_active
  on public.instagram_connections(ambassador_id)
  where disconnected_at is null;

create index if not exists instagram_connections_org
  on public.instagram_connections(organization_id)
  where disconnected_at is null;

create index if not exists instagram_connections_ig_account
  on public.instagram_connections(ig_business_account_id);

-- ─────────────────────────────────────────────────────────────────────────
-- instagram_posts
-- Raw IG media items pulled via the Graph API. One row per IG media id per
-- connection. Re-syncs upsert by (connection_id, ig_media_id).
-- `insights` holds reach / impressions / saves / video_views as a flexible
-- jsonb so we don't need a migration each time we add a metric.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.instagram_posts (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  ambassador_id       uuid not null references public.ambassadors(id) on delete cascade,
  connection_id       uuid not null references public.instagram_connections(id) on delete cascade,
  ig_media_id         text not null,
  media_type          text not null check (media_type in ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REEL')),
  permalink           text,
  media_url           text,
  thumbnail_url       text,
  caption             text,
  like_count          integer not null default 0 check (like_count >= 0),
  comments_count      integer not null default 0 check (comments_count >= 0),
  insights            jsonb not null default '{}'::jsonb,
  posted_at           timestamptz not null,
  first_synced_at     timestamptz not null default now(),
  last_synced_at      timestamptz not null default now()
);

create unique index if not exists instagram_posts_unique_media
  on public.instagram_posts(connection_id, ig_media_id);

create index if not exists instagram_posts_ambassador_posted
  on public.instagram_posts(ambassador_id, posted_at desc);

create index if not exists instagram_posts_org_posted
  on public.instagram_posts(organization_id, posted_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- Mirrors the content_shares pattern: admins read; service-role writes.
-- Token columns on instagram_connections are sensitive — admin reads exclude
-- them via a view (see below). Direct table reads only succeed via
-- service-role.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.instagram_connections enable row level security;
alter table public.instagram_posts       enable row level security;

drop policy if exists "ig connections read meta" on public.instagram_connections;
drop policy if exists "ig posts read"            on public.instagram_posts;

-- We keep the read policy off raw `instagram_connections` for admins and
-- expose a non-sensitive view instead. (Service role bypasses RLS, so the
-- callback + sync routes can still read tokens.)
-- If you prefer to allow admin reads on metadata columns directly, replace
-- the view with a column-restricted policy via a SECURITY DEFINER function.

create policy "ig posts read"
  on public.instagram_posts for select
  using (
    organization_id in (select public.caller_org_ids())
    and public.caller_has_permission(organization_id, 'ambassador.list.view')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Public-safe view of connections (no tokens). Admin UI reads from this.
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.instagram_connections_public
with (security_invoker = true) as
select
  c.id,
  c.organization_id,
  c.ambassador_id,
  c.ig_business_account_id,
  c.ig_username,
  c.fb_page_id,
  c.fb_page_name,
  c.scopes,
  c.connected_at,
  c.disconnected_at,
  c.last_synced_at,
  c.last_sync_error,
  c.token_expires_at
from public.instagram_connections c
where c.organization_id in (select public.caller_org_ids())
  and public.caller_has_permission(c.organization_id, 'ambassador.list.view');

grant select on public.instagram_connections_public to authenticated;
