-- Sonder Ambassador feature — Row-Level Security policies
--
-- Model:
--   * Each row carries `organization_id`. Every policy checks that
--     `organization_id` matches the caller's org.
--   * `auth.uid()` -> caller's auth user id. We assume an `organization_members`
--     mapping (user_id, organization_id, permissions[]) exists in the host
--     project; if it doesn't, the demo creates a minimal one below.
--   * Service-role bypasses RLS entirely (Supabase default). The user-app
--     side and the seed script run with the service role for the few writes
--     they need (ledger, content_shares, share_metrics).
--   * The redemption RPC in 0003 runs `security definer`, so it bypasses
--     RLS on its own writes; the policies here block direct INSERTs to the
--     ledger and redemptions table from regular admin sessions.

-- ─────────────────────────────────────────────────────────────────────────
-- Minimal members + permissions table (only created if missing).
-- The real Sonder app already has this; if you're wiring this migration into
-- it, drop this CREATE TABLE block and adapt `caller_has_permission()` to
-- whatever existing function/view exposes the caller's permissions.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.organization_members (
  user_id          uuid not null,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  permissions      text[] not null default '{}',
  created_at       timestamptz not null default now(),
  primary key (user_id, organization_id)
);

create or replace function public.caller_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

create or replace function public.caller_has_permission(
  org_id uuid,
  perm   text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = auth.uid()
      and m.organization_id = org_id
      and perm = any(m.permissions)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Enable RLS
-- ─────────────────────────────────────────────────────────────────────────

alter table public.organizations         enable row level security;
alter table public.ambassadors           enable row level security;
alter table public.campaigns             enable row level security;
alter table public.campaign_contents     enable row level security;
alter table public.content_shares        enable row level security;
alter table public.share_metrics         enable row level security;
alter table public.rewards               enable row level security;
alter table public.redemptions           enable row level security;
alter table public.points_ledger         enable row level security;
alter table public.audit_log             enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- Helpers — re-usable read predicate
-- ─────────────────────────────────────────────────────────────────────────

-- For brevity below, every "read by org members" policy uses the same form:
--   organization_id in (select public.caller_org_ids())

-- ─────────────────────────────────────────────────────────────────────────
-- organizations
-- Members can read their orgs. Settings updates require ambassador.settings.manage.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "orgs read by members"          on public.organizations;
drop policy if exists "orgs update by settings admin" on public.organizations;

create policy "orgs read by members"
  on public.organizations for select
  using (id in (select public.caller_org_ids()));

create policy "orgs update by settings admin"
  on public.organizations for update
  using (public.caller_has_permission(id, 'ambassador.settings.manage'))
  with check (public.caller_has_permission(id, 'ambassador.settings.manage'));

-- ─────────────────────────────────────────────────────────────────────────
-- ambassadors
-- Read: anyone with `ambassador.list.view` OR `ambassador.applicant.review`.
-- Insert: pending applications come from the user app (service role); admin
--   side cannot insert directly.
-- Update: requires `ambassador.applicant.review` (approve/reject/suspend).
-- Soft-delete only — DELETE is forbidden for everyone except service role.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "ambassadors read"          on public.ambassadors;
drop policy if exists "ambassadors update review" on public.ambassadors;

create policy "ambassadors read"
  on public.ambassadors for select
  using (
    organization_id in (select public.caller_org_ids())
    and (
      public.caller_has_permission(organization_id, 'ambassador.list.view')
      or public.caller_has_permission(organization_id, 'ambassador.applicant.review')
    )
  );

create policy "ambassadors update review"
  on public.ambassadors for update
  using (public.caller_has_permission(organization_id, 'ambassador.applicant.review'))
  with check (public.caller_has_permission(organization_id, 'ambassador.applicant.review'));

-- ─────────────────────────────────────────────────────────────────────────
-- campaigns
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "campaigns read"   on public.campaigns;
drop policy if exists "campaigns insert" on public.campaigns;
drop policy if exists "campaigns update" on public.campaigns;

create policy "campaigns read"
  on public.campaigns for select
  using (
    organization_id in (select public.caller_org_ids())
    and public.caller_has_permission(organization_id, 'ambassador.campaign.view')
  );

create policy "campaigns insert"
  on public.campaigns for insert
  with check (public.caller_has_permission(organization_id, 'ambassador.campaign.manage'));

create policy "campaigns update"
  on public.campaigns for update
  using (public.caller_has_permission(organization_id, 'ambassador.campaign.manage'))
  with check (public.caller_has_permission(organization_id, 'ambassador.campaign.manage'));

-- ─────────────────────────────────────────────────────────────────────────
-- campaign_contents
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "contents read"   on public.campaign_contents;
drop policy if exists "contents insert" on public.campaign_contents;
drop policy if exists "contents update" on public.campaign_contents;

create policy "contents read"
  on public.campaign_contents for select
  using (
    organization_id in (select public.caller_org_ids())
    and public.caller_has_permission(organization_id, 'ambassador.campaign.view')
  );

create policy "contents insert"
  on public.campaign_contents for insert
  with check (public.caller_has_permission(organization_id, 'ambassador.campaign.manage'));

create policy "contents update"
  on public.campaign_contents for update
  using (public.caller_has_permission(organization_id, 'ambassador.campaign.manage'))
  with check (public.caller_has_permission(organization_id, 'ambassador.campaign.manage'));

-- ─────────────────────────────────────────────────────────────────────────
-- content_shares + share_metrics
-- Admin reads only; writes are service-role only (user app / seed).
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "shares read"  on public.content_shares;
drop policy if exists "metrics read" on public.share_metrics;

create policy "shares read"
  on public.content_shares for select
  using (
    organization_id in (select public.caller_org_ids())
    and public.caller_has_permission(organization_id, 'ambassador.campaign.view')
  );

create policy "metrics read"
  on public.share_metrics for select
  using (
    organization_id in (select public.caller_org_ids())
    and public.caller_has_permission(organization_id, 'ambassador.campaign.view')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- rewards
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "rewards read"   on public.rewards;
drop policy if exists "rewards insert" on public.rewards;
drop policy if exists "rewards update" on public.rewards;

create policy "rewards read"
  on public.rewards for select
  using (
    organization_id in (select public.caller_org_ids())
    and public.caller_has_permission(organization_id, 'ambassador.reward.view')
  );

create policy "rewards insert"
  on public.rewards for insert
  with check (public.caller_has_permission(organization_id, 'ambassador.reward.manage'));

create policy "rewards update"
  on public.rewards for update
  using (public.caller_has_permission(organization_id, 'ambassador.reward.manage'))
  with check (public.caller_has_permission(organization_id, 'ambassador.reward.manage'));

-- ─────────────────────────────────────────────────────────────────────────
-- redemptions
-- Read: anyone with reward.view in the org.
-- Insert: blocked for client sessions — only the redeem_reward() RPC
--   (security definer) creates rows.
-- Update: only `mark_redemption_fulfilled()` flips status to 'fulfilled';
--   we still allow direct UPDATE for users with `ambassador.reward.manage`
--   so admins can correct mistakes via the table editor in development.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "redemptions read"   on public.redemptions;
drop policy if exists "redemptions update" on public.redemptions;

create policy "redemptions read"
  on public.redemptions for select
  using (
    organization_id in (select public.caller_org_ids())
    and public.caller_has_permission(organization_id, 'ambassador.reward.view')
  );

create policy "redemptions update"
  on public.redemptions for update
  using (public.caller_has_permission(organization_id, 'ambassador.reward.manage'))
  with check (public.caller_has_permission(organization_id, 'ambassador.reward.manage'));

-- (No insert policy: client-side INSERTs are blocked, redeem_reward() runs
-- as security definer and bypasses RLS for its own writes.)

-- ─────────────────────────────────────────────────────────────────────────
-- points_ledger
-- Read: org members with relevant view permission.
-- Insert: only manual adjustments are allowed from regular sessions, and
--   only if the caller has `ambassador.points.adjust`. All other source
--   types must come from the user app (service role) or from
--   redeem_reward() (security definer).
-- Update / Delete: never. The ledger is append-only.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "ledger read"             on public.points_ledger;
drop policy if exists "ledger insert manual"    on public.points_ledger;

create policy "ledger read"
  on public.points_ledger for select
  using (
    organization_id in (select public.caller_org_ids())
    and (
      public.caller_has_permission(organization_id, 'ambassador.list.view')
      or public.caller_has_permission(organization_id, 'ambassador.overview.view')
    )
  );

create policy "ledger insert manual"
  on public.points_ledger for insert
  with check (
    source_type = 'manual_adjustment'
    and public.caller_has_permission(organization_id, 'ambassador.points.adjust')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- audit_log
-- Read: anyone with any ambassador.* permission in the org. Inserts come
-- from triggers and definer-mode functions; we don't add an INSERT policy.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "audit read" on public.audit_log;

create policy "audit read"
  on public.audit_log for select
  using (organization_id in (select public.caller_org_ids()));
