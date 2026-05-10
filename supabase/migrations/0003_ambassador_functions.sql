-- Sonder Ambassador feature — functions, triggers, RPCs
--
-- This migration assumes 0001_ambassador_schema.sql and 0002_ambassador_rls.sql
-- have run.
--
-- What lives here:
--   1. Trigger to keep `ambassadors.points_balance` and
--      `ambassadors.lifetime_points_earned` in sync with the ledger.
--   2. `award_share_points()` — used by the user app + seed to write a
--      `share` ledger row, race-safe against the campaign cap.
--   3. `award_view_milestones()` — re-syncs metric crossings idempotently.
--   4. `redeem_reward()` — atomic redemption: stock, balance, ledger, code
--      generation, audit log. Returns existing row on idempotency-key reuse.
--   5. `mark_redemption_fulfilled()` — flips status, writes audit log.
--   6. `expire_scheduled_campaigns()` — pg_cron-callable status flipper.
--   7. `reconcile_ambassador_points()` — daily aggregate-vs-ledger check.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Cached balance trigger
-- The cached aggregate is for fast reads in admin dashboards. Critical
-- write paths (redeem_reward) recompute from the ledger inside the txn
-- rather than trusting this cache.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.points_ledger_apply_cache()
returns trigger
language plpgsql
as $$
begin
  -- Update points_balance with the delta. Lifetime only counts positive deltas.
  update public.ambassadors
  set
    points_balance = points_balance + new.delta,
    lifetime_points_earned = lifetime_points_earned + greatest(new.delta, 0)
  where id = new.ambassador_id;
  return new;
end;
$$;

drop trigger if exists trg_points_ledger_apply_cache on public.points_ledger;
create trigger trg_points_ledger_apply_cache
  after insert on public.points_ledger
  for each row execute function public.points_ledger_apply_cache();

-- ─────────────────────────────────────────────────────────────────────────
-- Internal: cap-checked award. Used by share + milestone awards.
-- Locks the campaign row, recomputes the campaign's awarded total from the
-- ledger, and either inserts a ledger row or skips (and ends the campaign
-- if cap is hit).
--
-- Returns the inserted ledger row id, or null if skipped.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.try_award_campaign_points(
  p_organization_id  uuid,
  p_ambassador_id    uuid,
  p_campaign_id      uuid,
  p_source_type      points_source,
  p_source_id        uuid,
  p_delta            integer,
  p_idempotency_key  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign        public.campaigns%rowtype;
  v_current_total   integer;
  v_balance_after   integer;
  v_inserted_id     uuid;
begin
  if p_delta <= 0 then
    raise exception 'try_award_campaign_points requires positive delta, got %', p_delta;
  end if;

  if p_source_type not in ('share', 'view_milestone') then
    raise exception 'try_award_campaign_points only handles share + view_milestone, got %', p_source_type;
  end if;

  -- Idempotency short-circuit. Required for milestone re-syncs.
  if p_idempotency_key is not null then
    perform 1 from public.points_ledger where idempotency_key = p_idempotency_key;
    if found then
      return null;
    end if;
  end if;

  -- Lock the campaign so concurrent awards serialize on cap-checking.
  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'campaign % not found', p_campaign_id;
  end if;

  -- Brief doesn't explicitly say whether milestones accrue while paused.
  -- Conservative read: paused stops all awards. Skip silently rather than
  -- raising so the user app's milestone batches don't error during a pause.
  if v_campaign.status <> 'active' then
    return null;
  end if;

  -- How much has this campaign already paid out?
  select coalesce(sum(delta), 0) into v_current_total
  from public.points_ledger
  where campaign_id = p_campaign_id
    and source_type in ('share', 'view_milestone');

  -- Cap check: skip the award entirely if it would overshoot. End the
  -- campaign if we've reached the cap.
  if v_current_total >= v_campaign.max_points_cap then
    if v_campaign.status = 'active' then
      update public.campaigns set status = 'ended' where id = p_campaign_id;
      insert into public.audit_log (organization_id, action, entity_type, entity_id, payload)
      values (p_organization_id, 'campaign.auto_end_cap', 'campaign', p_campaign_id,
              jsonb_build_object('current_total', v_current_total, 'cap', v_campaign.max_points_cap));
    end if;
    return null;
  end if;

  if v_current_total + p_delta > v_campaign.max_points_cap then
    -- Don't write a partial — brief says "skip the award entirely".
    return null;
  end if;

  -- Compute balance_after for the ledger row. Use coalesce to avoid races
  -- with the cache trigger; the trigger fires after this insert anyway.
  select coalesce(points_balance, 0) + p_delta
    into v_balance_after
  from public.ambassadors
  where id = p_ambassador_id;

  insert into public.points_ledger (
    organization_id, ambassador_id, source_type, source_id, campaign_id,
    delta, balance_after, idempotency_key
  ) values (
    p_organization_id, p_ambassador_id, p_source_type, p_source_id, p_campaign_id,
    p_delta, v_balance_after, p_idempotency_key
  )
  returning id into v_inserted_id;

  -- If this award reached the cap, end the campaign.
  if v_current_total + p_delta >= v_campaign.max_points_cap then
    update public.campaigns set status = 'ended' where id = p_campaign_id and status = 'active';
    insert into public.audit_log (organization_id, action, entity_type, entity_id, payload)
    values (p_organization_id, 'campaign.auto_end_cap', 'campaign', p_campaign_id,
            jsonb_build_object('current_total', v_current_total + p_delta,
                               'cap', v_campaign.max_points_cap));
  end if;

  return v_inserted_id;
end;
$$;

revoke all on function public.try_award_campaign_points(uuid, uuid, uuid, points_source, uuid, integer, text)
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Share-time award (called by user app or seed when a share is created)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.award_share_points(p_content_share_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share public.content_shares%rowtype;
begin
  select * into v_share from public.content_shares where id = p_content_share_id;
  if not found then raise exception 'content_share % not found', p_content_share_id; end if;

  if v_share.points_awarded_for_share = 0 then
    return null;
  end if;

  return public.try_award_campaign_points(
    v_share.organization_id,
    v_share.ambassador_id,
    v_share.campaign_id,
    'share',
    v_share.id,
    v_share.points_awarded_for_share,
    'share:' || v_share.id::text
  );
end;
$$;

revoke all on function public.award_share_points(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. View-milestone award. Idempotent by (share_id, n).
-- Call this after updating share_metrics.views; it backfills any newly-
-- crossed thousands. Re-syncing the same view count is a no-op.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.award_view_milestones(p_content_share_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share          public.content_shares%rowtype;
  v_views          bigint;
  v_per_1k         integer;
  v_milestones     integer;
  v_inserted       integer := 0;
  n                integer;
  v_inserted_one   uuid;
begin
  select * into v_share from public.content_shares where id = p_content_share_id;
  if not found then raise exception 'content_share % not found', p_content_share_id; end if;

  v_per_1k := v_share.points_per_1k_views_snapshot;
  if v_per_1k = 0 then return 0; end if;

  select coalesce(views, 0) into v_views from public.share_metrics where content_share_id = p_content_share_id;
  v_milestones := floor(v_views / 1000)::integer;

  -- Walk every milestone n; idempotency key prevents duplicates so this is
  -- safe to re-run on the same view count.
  for n in 1..v_milestones loop
    v_inserted_one := public.try_award_campaign_points(
      v_share.organization_id,
      v_share.ambassador_id,
      v_share.campaign_id,
      'view_milestone',
      v_share.id,
      v_per_1k,
      format('milestone:%s:%s', v_share.id::text, n)
    );
    if v_inserted_one is not null then v_inserted := v_inserted + 1; end if;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.award_view_milestones(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Atomic redemption
-- All-or-nothing: stock decrement + ledger debit + redemption row + audit
-- log. Idempotent by (ambassador_id, idempotency_key).
-- ─────────────────────────────────────────────────────────────────────────

-- Code generator using the unambiguous alphabet. CSPRNG-backed via gen_random_bytes().
create or replace function public.generate_redemption_code()
returns text
language plpgsql
as $$
declare
  alphabet  constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  alpha_len constant integer := length(alphabet);
  bytes     bytea;
  out_chars text := '';
  i         integer;
begin
  bytes := gen_random_bytes(8);
  for i in 0..7 loop
    out_chars := out_chars || substr(alphabet, (get_byte(bytes, i) % alpha_len) + 1, 1);
  end loop;
  return 'SONDER-' || substr(out_chars, 1, 4) || '-' || substr(out_chars, 5, 4);
end;
$$;

create or replace function public.redeem_reward(
  p_ambassador_id    uuid,
  p_reward_id        uuid,
  p_idempotency_key  uuid,
  p_actor_id         uuid default null
)
returns public.redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing       public.redemptions%rowtype;
  v_reward         public.rewards%rowtype;
  v_ambassador     public.ambassadors%rowtype;
  v_balance        integer;
  v_code           text;
  v_attempt        integer := 0;
  v_redemption     public.redemptions%rowtype;
begin
  -- Idempotency short-circuit.
  select * into v_existing
  from public.redemptions
  where ambassador_id = p_ambassador_id and idempotency_key = p_idempotency_key;
  if found then return v_existing; end if;

  -- Lock reward + load ambassador.
  select * into v_reward
  from public.rewards
  where id = p_reward_id
  for update;
  if not found then raise exception 'reward % not found', p_reward_id; end if;
  if v_reward.archived_at is not null then raise exception 'reward archived'; end if;
  if not v_reward.is_active then raise exception 'reward inactive'; end if;
  if v_reward.remaining_stock <= 0 then raise exception 'reward out of stock'; end if;

  select * into v_ambassador from public.ambassadors where id = p_ambassador_id;
  if not found then raise exception 'ambassador % not found', p_ambassador_id; end if;
  if v_ambassador.organization_id <> v_reward.organization_id then
    raise exception 'ambassador and reward belong to different orgs';
  end if;
  if v_ambassador.status <> 'approved' then
    raise exception 'ambassador not approved (status: %)', v_ambassador.status;
  end if;

  -- Recompute balance from ledger inside the txn rather than trusting the cache.
  select coalesce(sum(delta), 0) into v_balance
  from public.points_ledger
  where ambassador_id = p_ambassador_id;

  if v_balance < v_reward.points_cost then
    raise exception 'insufficient points (have: %, need: %)', v_balance, v_reward.points_cost;
  end if;

  -- Decrement stock.
  update public.rewards set remaining_stock = remaining_stock - 1 where id = v_reward.id;

  -- Generate a unique code. Up to 5 attempts on collision.
  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_redemption_code();
    begin
      insert into public.redemptions (
        organization_id, ambassador_id, reward_id, code,
        points_spent, status, idempotency_key
      ) values (
        v_reward.organization_id, p_ambassador_id, v_reward.id, v_code,
        v_reward.points_cost, 'pending', p_idempotency_key
      )
      returning * into v_redemption;
      exit;
    exception
      when unique_violation then
        if v_attempt >= 5 then
          raise exception 'failed to generate unique redemption code after 5 attempts';
        end if;
    end;
  end loop;

  -- Ledger debit. Same idempotency_key as the redemption (different namespace
  -- because the column type is text and we prefix it).
  insert into public.points_ledger (
    organization_id, ambassador_id, source_type, source_id, campaign_id,
    delta, balance_after, idempotency_key
  ) values (
    v_reward.organization_id, p_ambassador_id, 'redemption', v_redemption.id, null,
    -v_reward.points_cost, v_balance - v_reward.points_cost,
    'redemption:' || v_redemption.id::text
  );

  -- Audit log.
  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, payload)
  values (
    v_reward.organization_id, p_actor_id, 'redemption.create', 'redemption', v_redemption.id,
    jsonb_build_object(
      'ambassador_id', p_ambassador_id,
      'reward_id', v_reward.id,
      'points_spent', v_reward.points_cost,
      'code', v_code
    )
  );

  return v_redemption;
end;
$$;

revoke all on function public.redeem_reward(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.redeem_reward(uuid, uuid, uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Mark redemption fulfilled
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.mark_redemption_fulfilled(
  p_redemption_id uuid,
  p_actor_id      uuid
)
returns public.redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption public.redemptions%rowtype;
begin
  select * into v_redemption from public.redemptions where id = p_redemption_id for update;
  if not found then raise exception 'redemption not found'; end if;
  if v_redemption.status = 'fulfilled' then return v_redemption; end if;

  -- Permission check.
  if not public.caller_has_permission(v_redemption.organization_id, 'ambassador.reward.manage') then
    raise exception 'permission denied';
  end if;

  update public.redemptions
  set status = 'fulfilled', fulfilled_at = now(), fulfilled_by = p_actor_id
  where id = p_redemption_id
  returning * into v_redemption;

  insert into public.audit_log (organization_id, actor_id, action, entity_type, entity_id, payload)
  values (
    v_redemption.organization_id, p_actor_id, 'redemption.fulfill', 'redemption', v_redemption.id,
    jsonb_build_object('code', v_redemption.code)
  );

  return v_redemption;
end;
$$;

revoke all on function public.mark_redemption_fulfilled(uuid, uuid) from public, anon;
grant execute on function public.mark_redemption_fulfilled(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Date-based status flipper. Wire to pg_cron with `select cron.schedule(...)`
-- or call from an external scheduler every minute. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.expire_scheduled_campaigns()
returns table(updated_id uuid, new_status campaign_status)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- scheduled → active
  return query
  update public.campaigns
  set status = 'active'
  where status = 'scheduled'
    and start_date is not null
    and start_date <= now()
    and (end_date is null or end_date > now())
  returning id, status;

  -- active → ended (when end_date passes)
  return query
  update public.campaigns
  set status = 'ended'
  where status in ('active', 'paused')
    and end_date is not null
    and end_date <= now()
  returning id, status;
end;
$$;

revoke all on function public.expire_scheduled_campaigns() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Daily reconciliation
-- Logs any drift between cached aggregates and the ledger. Run nightly.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.reconcile_ambassador_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drift_count integer := 0;
  r record;
begin
  for r in
    with ledger_agg as (
      select
        ambassador_id,
        coalesce(sum(delta), 0) as computed_balance,
        coalesce(sum(greatest(delta, 0)), 0) as computed_lifetime
      from public.points_ledger
      group by ambassador_id
    )
    select a.id,
           a.organization_id,
           a.points_balance,
           a.lifetime_points_earned,
           coalesce(l.computed_balance, 0)  as computed_balance,
           coalesce(l.computed_lifetime, 0) as computed_lifetime
    from public.ambassadors a
    left join ledger_agg l on l.ambassador_id = a.id
    where coalesce(l.computed_balance, 0)  <> a.points_balance
       or coalesce(l.computed_lifetime, 0) <> a.lifetime_points_earned
  loop
    -- Repair the cache, but log the drift first so we can investigate.
    insert into public.audit_log (organization_id, action, entity_type, entity_id, payload)
    values (
      r.organization_id, 'ambassador.points_drift', 'ambassador', r.id,
      jsonb_build_object(
        'cached_balance',   r.points_balance,
        'computed_balance', r.computed_balance,
        'cached_lifetime',  r.lifetime_points_earned,
        'computed_lifetime', r.computed_lifetime
      )
    );

    update public.ambassadors
    set points_balance = r.computed_balance,
        lifetime_points_earned = r.computed_lifetime
    where id = r.id;

    v_drift_count := v_drift_count + 1;
  end loop;

  return v_drift_count;
end;
$$;

revoke all on function public.reconcile_ambassador_points() from public, anon, authenticated;
