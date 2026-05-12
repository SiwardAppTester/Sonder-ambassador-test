-- Sonder Ambassador feature — Publish drives mobile visibility.
--
-- Problem: 0008 introduced `is_public` on campaigns + organizations as a
-- separate visibility gate. The desktop admin's "Publish" action sets a
-- campaign's `status = 'active'` but doesn't touch `is_public`, so
-- publishing did not make the campaign visible on mobile. That violates
-- the admin's mental model: the Publish button should be the bridge.
--
-- Fix: use the lifecycle the admin already controls.
--   • Campaigns: visible iff status = 'active' and not archived. Drop
--     the is_public requirement. (The column stays; it's just not a
--     gate anymore. We could remove it in a future cleanup migration.)
--   • Rewards: visible iff is_active and not archived. Drop the join
--     onto organizations.is_public — orgs with no public flag would
--     otherwise hide their own rewards even after publish.
--   • Organizations: keep is_public as the gate, but flip the default
--     to `true` so newly-created orgs appear automatically. Backfill
--     any existing rows to true so the desktop's existing data shows
--     up on mobile without manual SQL.
--
-- Net effect: the desktop's existing Publish + create-organization
-- flows are now the source of truth for what mobile users see.

-- ─────────────────────────────────────────────────────────────────────────
-- Campaigns — gate on status only.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "campaigns public read" on public.campaigns;

create policy "campaigns public read"
  on public.campaigns
  for select
  to anon, authenticated
  using (
    status = 'active'
    and archived_at is null
  );

-- The 0008 partial index was predicated on `is_public`. Keep it for any
-- internal queries that still filter on the column, but add a new index
-- aligned with the new policy.
create index if not exists campaigns_active_unarchived
  on public.campaigns(status)
  where status = 'active' and archived_at is null;

-- ─────────────────────────────────────────────────────────────────────────
-- Campaign contents — relax the parent-campaign filter to drop is_public.
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "campaign_contents public read" on public.campaign_contents;

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
        and c.status = 'active'
        and c.archived_at is null
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Rewards — gate on is_active only; drop the org.is_public join so a
-- newly-created org's rewards are visible even before any campaign is
-- published. (Org visibility is governed separately below.)
-- ─────────────────────────────────────────────────────────────────────────

drop policy if exists "rewards public read" on public.rewards;

create policy "rewards public read"
  on public.rewards
  for select
  to anon, authenticated
  using (
    is_active = true
    and archived_at is null
  );

-- ─────────────────────────────────────────────────────────────────────────
-- Organizations — default to public, backfill existing rows.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.organizations
  alter column is_public set default true;

update public.organizations
   set is_public = true
 where is_public = false;
