-- Sonder Ambassador feature — Mobile public rewards.
--
-- Extends the public-browse layer added in 0008 to cover rewards. The
-- mobile Discover screen shows a "Worth earning" strip of rewards from
-- active public programs; FestivalDetail shows the same set filtered by
-- org. Both read paths funnel through this single anon SELECT policy.
--
-- Visibility rule: a reward is visible to the anon role when
--   (1) it's flagged is_active = true,
--   (2) it isn't archived, AND
--   (3) its parent organization is is_public = true.
--
-- We deliberately do NOT add a `rewards.is_public` column. Rewards inherit
-- their parent org's publicness — a festival that opts into the public
-- catalog opts in its rewards too. If we later need per-reward gating
-- (e.g. private rewards for top-tier ambassadors), add a column then.

drop policy if exists "rewards public read" on public.rewards;

create policy "rewards public read"
  on public.rewards
  for select
  to anon, authenticated
  using (
    is_active = true
    and archived_at is null
    and exists (
      select 1
      from public.organizations o
      where o.id = rewards.organization_id
        and o.is_public = true
    )
  );

-- Index supporting "list active rewards for a public org" queries (used by
-- both Discover and FestivalDetail). Plain index because `is_public` lives
-- on a different table; partial predicate stays local to `rewards`.
create index if not exists rewards_org_active_unarchived
  on public.rewards(organization_id, is_active)
  where archived_at is null;
