-- Sonder Ambassador feature — Instagram Stories table.
--
-- Why a separate table from instagram_posts: stories have a different
-- lifecycle (Meta deletes them from the API after 24h), a different metric
-- set (taps_forward/back, exits, replies — none of which apply to feed
-- posts), and a different aspect ratio in the UI (9:16). Mixing them into
-- instagram_posts would mean nullable columns everywhere and confused queries.
--
-- Once a story expires it stays in our DB indefinitely; future syncs can't
-- "see" it again from Meta, so we treat the first sync as authoritative.

create table if not exists public.instagram_stories (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  ambassador_id       uuid not null references public.ambassadors(id) on delete cascade,
  connection_id       uuid not null references public.instagram_connections(id) on delete cascade,
  ig_media_id         text not null,
  media_type          text not null check (media_type in ('IMAGE', 'VIDEO')),
  permalink           text,
  media_url           text,
  thumbnail_url       text,
  insights            jsonb not null default '{}'::jsonb,
  posted_at           timestamptz not null,
  expires_at          timestamptz not null,
  first_synced_at     timestamptz not null default now(),
  last_synced_at      timestamptz not null default now()
);

create unique index if not exists instagram_stories_unique_media
  on public.instagram_stories(connection_id, ig_media_id);

create index if not exists instagram_stories_ambassador_posted
  on public.instagram_stories(ambassador_id, posted_at desc);

-- Plain (non-partial) index on (connection_id, expires_at) — Postgres
-- rejects partial-index predicates that use now() because the function
-- isn't IMMUTABLE. Queries that filter on `expires_at > now()` still use
-- this index via a range scan; the index is just slightly larger.
create index if not exists instagram_stories_connection_expires
  on public.instagram_stories(connection_id, expires_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: same shape as instagram_posts (admin reads, service-role writes).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.instagram_stories enable row level security;

drop policy if exists "ig stories read" on public.instagram_stories;

create policy "ig stories read"
  on public.instagram_stories for select
  using (
    organization_id in (select public.caller_org_ids())
    and public.caller_has_permission(organization_id, 'ambassador.list.view')
  );
