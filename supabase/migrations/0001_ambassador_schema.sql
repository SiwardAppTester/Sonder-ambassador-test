-- Sonder Ambassador feature — schema
--
-- Conventions:
--   * Soft delete: every user-managed entity has `archived_at timestamptz`.
--     Default queries filter `archived_at IS NULL`. Hard deletes preserved
--     for `share_metrics` (re-syncs replace) and `audit_log` (write-once).
--   * RLS scope: every table is scoped by `organization_id`. Policies are
--     in 0002_ambassador_rls.sql.
--   * Money/points columns are `numeric` not `float` — points are integers
--     but we keep numeric so future fractional point schemes don't migrate.
--
-- This migration creates types, tables and indexes. Triggers, functions and
-- the redemption RPC live in 0003_ambassador_functions.sql.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────

do $$ begin
  create type campaign_status as enum (
    'draft', 'scheduled', 'active', 'paused', 'ended', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_content_type as enum ('image', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ambassador_status as enum (
    'pending', 'approved', 'rejected', 'suspended', 'removed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type points_source as enum (
    'share', 'view_milestone', 'redemption', 'manual_adjustment'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type redemption_status as enum ('pending', 'fulfilled');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Organization settings — additive columns
-- We expect an `organizations` table to already exist; this feature adds
-- ambassador-specific settings to it. If it doesn't exist (greenfield demo),
-- we create a minimal version so foreign keys resolve.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  theme_color     text not null default '#7c5cff',
  created_at      timestamptz not null default now()
);

alter table public.organizations
  add column if not exists currency text not null default 'EUR',
  add column if not exists instagram_paid_baseline_cpv numeric(10, 4) not null default 0.0150,
  add column if not exists platform_share_cost numeric(10, 4) not null default 0.3500;

-- Sanity: currency should be a 3-letter ISO 4217 code.
alter table public.organizations
  drop constraint if exists organizations_currency_iso4217;
alter table public.organizations
  add constraint organizations_currency_iso4217
  check (currency ~ '^[A-Z]{3}$');

-- ─────────────────────────────────────────────────────────────────────────
-- Ambassadors
-- Represents both the application and the resulting membership; status moves
-- through the lifecycle in place rather than creating new rows.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.ambassadors (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  user_id                  uuid,                                          -- FK to user-app accounts
  instagram_handle         text,
  instagram_follower_count integer not null default 0 check (instagram_follower_count >= 0),
  first_name               text,
  last_name                text,
  email                    text,
  age                      integer check (age is null or (age >= 13 and age <= 120)),
  country                  text,                                          -- ISO 3166-1 alpha-2
  profile_picture_url      text,
  status                   ambassador_status not null default 'pending',
  rejection_reason         text,
  applied_at               timestamptz not null default now(),
  decided_at               timestamptz,
  decided_by               uuid,                                          -- admin user id
  points_balance           integer not null default 0,                    -- cached aggregate
  lifetime_points_earned   integer not null default 0,                    -- cached aggregate
  archived_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- A user can apply to many orgs but only once per org.
create unique index if not exists ambassadors_unique_user_per_org
  on public.ambassadors(user_id, organization_id)
  where user_id is not null;

create index if not exists ambassadors_org_status
  on public.ambassadors(organization_id, status)
  where archived_at is null;

create index if not exists ambassadors_org_country
  on public.ambassadors(organization_id, country)
  where archived_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Campaigns
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  description       text,
  cover_image_path  text,                                               -- storage path in `ambassador-media`
  status            campaign_status not null default 'draft',
  start_date        timestamptz,
  end_date          timestamptz,
  max_points_cap    integer not null check (max_points_cap > 0),
  created_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz,
  constraint campaigns_dates_ordered check (
    start_date is null or end_date is null or start_date <= end_date
  )
);

create index if not exists campaigns_org_status
  on public.campaigns(organization_id, status)
  where archived_at is null;

create index if not exists campaigns_status_window
  on public.campaigns(status, start_date, end_date)
  where archived_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Campaign content
-- A campaign holds many of these; uploaded one-at-a-time from the campaign
-- detail page. Editing point values does NOT retroactively change earned
-- points — values are snapshotted onto each share row at share time.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.campaign_contents (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  campaign_id           uuid not null references public.campaigns(id) on delete cascade,
  type                  campaign_content_type not null,
  file_path             text not null,                                  -- storage path in `ambassador-media`
  thumbnail_path        text,                                           -- video frame extracted server-side
  file_size_bytes       bigint not null check (file_size_bytes > 0),
  points_per_share      integer not null check (points_per_share >= 0),
  points_per_1k_views   integer not null check (points_per_1k_views >= 0),
  caption_template      text,
  hashtags              text[] not null default '{}',
  instructions          text,
  display_order         integer,                                        -- nullable; falls back to created_at desc
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  archived_at           timestamptz
);

create index if not exists campaign_contents_campaign
  on public.campaign_contents(campaign_id)
  where archived_at is null;

create index if not exists campaign_contents_org_campaign_order
  on public.campaign_contents(organization_id, campaign_id, display_order, created_at desc)
  where archived_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Content shares
-- One ambassador sharing one piece of content on Instagram. Created by the
-- user app (or seed script). Snapshots points-per-share and points-per-1k-
-- views at creation so subsequent edits to the content piece don't change
-- already-earned awards.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.content_shares (
  id                              uuid primary key default gen_random_uuid(),
  organization_id                 uuid not null references public.organizations(id) on delete cascade,
  campaign_content_id             uuid not null references public.campaign_contents(id) on delete cascade,
  campaign_id                     uuid not null references public.campaigns(id) on delete cascade,
  ambassador_id                   uuid not null references public.ambassadors(id) on delete cascade,
  platform                        text not null default 'instagram' check (platform = 'instagram'),
  instagram_post_url              text not null,
  shared_at                       timestamptz not null default now(),
  points_awarded_for_share        integer not null check (points_awarded_for_share >= 0),
  points_per_1k_views_snapshot    integer not null check (points_per_1k_views_snapshot >= 0),
  created_at                      timestamptz not null default now()
);

-- Enforce: same content piece + same ambassador + same post URL = one share.
create unique index if not exists content_shares_unique_post
  on public.content_shares(campaign_content_id, ambassador_id, instagram_post_url);

create index if not exists content_shares_campaign
  on public.content_shares(campaign_id);

create index if not exists content_shares_ambassador
  on public.content_shares(ambassador_id);

create index if not exists content_shares_content
  on public.content_shares(campaign_content_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Share metrics
-- 1:1 with content_shares — single row updated over time as Instagram
-- view/like/comment/save counts change.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.share_metrics (
  content_share_id   uuid primary key references public.content_shares(id) on delete cascade,
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  views              bigint not null default 0 check (views >= 0),
  likes              bigint not null default 0 check (likes >= 0),
  comments           bigint not null default 0 check (comments >= 0),
  saves              bigint not null default 0 check (saves >= 0),
  last_synced_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Rewards
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.rewards (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  description       text,
  image_path        text,                                               -- storage path in `reward-images` (public)
  points_cost       integer not null check (points_cost > 0),
  total_stock       integer not null check (total_stock >= 0),
  remaining_stock   integer not null check (remaining_stock >= 0),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz,
  constraint rewards_remaining_le_total check (remaining_stock <= total_stock)
);

create index if not exists rewards_org_active
  on public.rewards(organization_id, is_active)
  where archived_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Redemptions
-- Created exclusively by the redeem_reward() function (see 0003).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.redemptions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  ambassador_id     uuid not null references public.ambassadors(id) on delete cascade,
  reward_id         uuid not null references public.rewards(id),       -- no cascade: never lose history
  code              text not null unique,
  points_spent      integer not null check (points_spent > 0),
  status            redemption_status not null default 'pending',
  idempotency_key   uuid not null,
  created_at        timestamptz not null default now(),
  fulfilled_at      timestamptz,
  fulfilled_by      uuid,
  constraint redemptions_fulfilled_consistency check (
    (status = 'fulfilled' and fulfilled_at is not null)
    or (status = 'pending' and fulfilled_at is null and fulfilled_by is null)
  )
);

-- Idempotency is per-ambassador (a UUID is unique enough globally, but
-- scoping to ambassador matches how the user app generates them).
create unique index if not exists redemptions_idempotency
  on public.redemptions(ambassador_id, idempotency_key);

create index if not exists redemptions_org_status_created
  on public.redemptions(organization_id, status, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- Points ledger
-- Append-only. The single source of truth for ambassador balances.
-- `points_balance` on the ambassador row is a cached aggregate maintained
-- by trigger (0003).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.points_ledger (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  ambassador_id     uuid not null references public.ambassadors(id) on delete cascade,
  source_type       points_source not null,
  source_id         uuid,                                               -- content_share_id / redemption_id / etc.
  campaign_id       uuid references public.campaigns(id) on delete set null,
  delta             integer not null,                                   -- positive (award) or negative (spend)
  balance_after     integer not null,
  idempotency_key   text,                                               -- e.g. 'milestone:{share_id}:{n}'
  created_at        timestamptz not null default now(),

  -- An entry must reference its source for non-manual rows.
  constraint points_ledger_source_id_required check (
    source_type = 'manual_adjustment' or source_id is not null
  ),

  -- Redemptions are spends, milestones and shares are awards. Manual
  -- adjustments can go either way.
  constraint points_ledger_sign check (
    (source_type in ('share', 'view_milestone') and delta > 0)
    or (source_type = 'redemption' and delta < 0)
    or (source_type = 'manual_adjustment')
  )
);

-- Idempotency for milestone re-syncs and redemption retries. Sparse so we
-- don't penalize manual adjustments which intentionally repeat.
create unique index if not exists points_ledger_idempotency_key
  on public.points_ledger(idempotency_key)
  where idempotency_key is not null;

create index if not exists points_ledger_ambassador_created
  on public.points_ledger(ambassador_id, created_at desc);

create index if not exists points_ledger_campaign_source
  on public.points_ledger(campaign_id, source_type)
  where campaign_id is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- Audit log
-- Single org-wide log for every admin-side mutation. Triggers and the
-- redemption fn write here in the same transaction as the mutation.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.audit_log (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  actor_id          uuid,                                               -- nullable: system actions
  action            text not null,                                      -- e.g. 'campaign.pause', 'ambassador.approve'
  entity_type       text not null,
  entity_id         uuid,
  payload           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists audit_log_org_created
  on public.audit_log(organization_id, created_at desc);

create index if not exists audit_log_entity
  on public.audit_log(entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'ambassadors', 'campaigns', 'campaign_contents', 'rewards'
    ])
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated_at on public.%1$s;
       create trigger trg_%1$s_updated_at
       before update on public.%1$s
       for each row execute function public.touch_updated_at();',
      t
    );
  end loop;
end $$;
