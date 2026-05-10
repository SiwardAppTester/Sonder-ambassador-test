# Sonder Ambassador feature — beta demo

Implements **Phase 1 (foundation)** and **Phase 2 (data model + storage)** of the build brief in `sonder-ambassador-build-plan.md`.

This is a greenfield demo. It is structured to graft into the existing Sonder admin app later, but here it stands alone.

## What's in this build

### Phase 1 — Foundation
- Next.js 15 + TypeScript + Tailwind + shadcn-style tokens (dark theme by default)
- Main sidebar + animated secondary "Ambassadors" sidebar (framer-motion slide-in)
- Brand-color theming hook (`OrganizationProvider`) that pushes `--brand-rgb` into a CSS custom property at runtime, so `bg-brand`, `text-brand`, etc. resolve to whichever org is loaded
- `PermissionsProvider` + `<PermissionGuard>` matching the brief's `hasPermission(key)` API
- All 11 ambassador routes scaffolded as empty pages, each wrapped in the appropriate `<PermissionGuard>`
- next-intl set up with the full `Ambassadors.*` locale namespace
- React Query provider (1 hook per resource pattern lands in phase 3)

### Phase 2 — Data model + storage
- `supabase/migrations/0001_ambassador_schema.sql` — tables, indexes, soft-delete, audit log, `updated_at` triggers
- `supabase/migrations/0002_ambassador_rls.sql` — RLS policies. Ledger is locked down: only `redeem_reward()` and the user-app service role can write; admin sessions can only insert `manual_adjustment` rows (and only with the right permission)
- `supabase/migrations/0003_ambassador_functions.sql`
  - `try_award_campaign_points()` — locks the campaign row, recomputes total awarded from the ledger, skips the award if it would overshoot the cap, and ends the campaign when the cap is reached. This is the race-safe primitive used by both share + milestone awards.
  - `award_share_points()` — used by the user app / seed when a share is created.
  - `award_view_milestones()` — idempotent by `milestone:{share_id}:{n}` key. Re-syncing the same view count is a no-op; only newly-crossed thousands write rows.
  - `redeem_reward()` — atomic: lock reward → check stock + balance from ledger → decrement stock → insert redemption + ledger debit + audit log, all in one txn. Idempotent by `(ambassador_id, idempotency_key)`. Code generation uses `gen_random_bytes` over the unambiguous alphabet, retries up to 5 times on collision.
  - `mark_redemption_fulfilled()` — flips status, writes audit log.
  - `expire_scheduled_campaigns()` — pg_cron-callable status flipper for `scheduled → active` and `active → ended`.
  - `reconcile_ambassador_points()` — daily drift check: compares cached `points_balance` / `lifetime_points_earned` against ledger sums, logs drift to audit log, repairs the cache.
- `supabase/migrations/0004_ambassador_storage.sql` — `ambassador-media` (private) + `reward-images` (public) buckets with MIME / size limits, plus storage RLS policies that pull the org_id from the path prefix (`{org_id}/...`).
- `src/server-actions/uploads.ts` — server-side validation + signed-upload URL creation for campaign images, campaign videos, and reward images. MIME and size limits per the brief (10 MB images, 100 MB videos, 5 MB reward images).

## What's stubbed out (intentional)

These are real lines that will need to change when this lands in the Sonder app:

- **`organization_members` table** in `0002_*.sql` — the real Sonder app already has a member/permissions table. Drop the `create table if not exists` and adapt `caller_has_permission()` to use whatever exists.
- **`PermissionsProvider`** seeds from `DEMO_ADMIN_PERMISSIONS`. Replace its body with whatever feeds the real permissions today.
- **`OrganizationProvider`** ships with a hard-coded `DEMO_ORG`. Replace with the real org fetch.
- **Main sidebar** is a shell — the real Sonder main sidebar already exists. Discard `main-sidebar.tsx` when grafting; keep `ambassadors-secondary-sidebar.tsx`, `permission-guard.tsx`, `page-shell.tsx`, and the `ambassadors/*` routes.
- **No video thumbnail extraction yet.** The brief calls for ffmpeg-based thumbnail extraction on upload. Stubbed: `campaign_contents.thumbnail_path` is nullable and the upload action doesn't kick off the job. Wire to a server action or edge function in phase 5.
- **No middleware refresh.** Real Sonder uses Supabase auth middleware to refresh sessions. Add when integrating.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in real Supabase values
npm run dev
```

App runs at `http://localhost:3000`, redirects to `/dashboard/ambassadors/campaigns`. Without Supabase env vars, the UI still loads — providers are mocked. Anything that hits the DB will error.

### Applying the migrations

Order matters — apply `0001 → 0002 → 0003 → 0004`.

Using the Supabase CLI:
```bash
supabase db push
```

Or via the Supabase MCP tool / Studio: paste each file's contents into the SQL editor in order.

### Wiring up pg_cron (production)

The brief requires:
- A scheduler running `expire_scheduled_campaigns()` every minute
- A daily run of `reconcile_ambassador_points()`

In the Supabase SQL editor:
```sql
select cron.schedule('expire-scheduled-campaigns', '* * * * *',
                     $$select public.expire_scheduled_campaigns()$$);
select cron.schedule('reconcile-ambassador-points', '0 3 * * *',
                     $$select public.reconcile_ambassador_points()$$);
```

## Architectural notes worth knowing

### Why points are an integer column

The brief says "points are the only ambassador currency" — they're awarded in whole units (per-share + per-1k-views milestones). Using `integer` everywhere catches arithmetic mistakes the type system would otherwise miss; if fractional points become a thing, migrate to `numeric(12, 2)` then.

### Why the cap check locks the campaign row

Two concurrent milestone awards from the user app could both read `current_total = 9_990`, both decide they fit under a cap of 10_000, and both insert — overshooting the cap by one award. `SELECT … FOR UPDATE` on the campaign row serializes them. The brief is explicit about this; the code matches.

### Why the redemption fn recomputes balance from the ledger

The cached `points_balance` is fast to read but can drift (a buggy migration, a manual SQL fix, etc.). Spending real-world value (a redeemed reward) is a critical path: `redeem_reward()` runs `SELECT coalesce(sum(delta), 0)` from the ledger inside the transaction. A drift in the cache can't cause an over-spend.

### Why the ledger is append-only with sparse idempotency_key uniqueness

Milestone re-syncs from the user app must be safe — they may run repeatedly for the same share. The unique index is `WHERE idempotency_key IS NOT NULL` so manual adjustments (which intentionally don't have a key) don't collide.

### Why storage paths start with `{org_id}/`

The storage RLS policies pull the org_id directly from the path prefix and run it through `caller_has_permission()`. This means a malicious client trying to write under another org's prefix is rejected at the storage layer, not just the table layer.

## Realtime

Four channels per the brief, in `src/hooks/use-realtime.ts`:

- `useRealtimeCampaignMetrics(campaignId)` — wired into the campaign detail page; subscribes to `content_shares` filtered by `campaign_id` + `share_metrics`
- `useRealtimeContentMetrics(contentId)` — wired into the content detail page
- `useRealtimeRedemptions(orgId)` — wired into the redemptions table
- `useRealtimePendingApplications(orgId)` — wired into the secondary sidebar (drives the Pending badge)

All updates throttled via `useThrottledInvalidate` to one cache invalidation per second per query key, per the brief.

**Mock-mode guard**: each hook calls `useRealtimeEnabled()` which returns `false` when `NEXT_PUBLIC_USE_MOCK_PROVIDERS=true`. The hooks are safe to call from any page in any environment — they no-op cleanly without Supabase.

## Demo seeder

`scripts/seed-ambassador-demo.ts` writes the same shape of data the in-app mocks render, but to a real Supabase project. Adds `tsx` as a devDep so the script runs directly without a build step.

```bash
# Seed an existing org
npm run seed -- --orgId=<uuid>

# Wipe demo rows for an org and reseed
npm run seed -- --orgId=<uuid> --reset

# Create a fresh org and seed it
npm run seed -- --new-org="Demo Hospitality"
```

Reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. Uses the service role to bypass RLS — same as the user-app side will when it lands.

What it writes (matches brief §10):
- 4 campaigns: 1 draft, 2 active, 1 ended
- 8–12 content pieces per non-draft campaign (mix images + videos)
- 15 ambassadors: 8 approved, 4 pending, 2 rejected (with reasons), 1 suspended
- ~80 shares with power-law view distribution (6 rewards, 9 redemptions in mixed states)

After seeding, run the share/milestone award functions to populate the ledger so points balances sync:

```sql
select public.award_share_points(id) from public.content_shares;
select public.award_view_milestones(id) from public.content_shares;
```

The "Reset demo data" admin action from §10 of the brief is structured but not yet in the UI — it'd live on a settings page that doesn't exist in this demo. The CLI's `--reset` flag covers the same job for now.

## Build status

| Phase | Status |
|---|---|
| 1. Foundation | done |
| 2. Data model + storage | done |
| 3. Hook layer (mock-backed) | done |
| 4. Campaigns: list + create + detail | done |
| 5. Campaign content: upload drawer + detail | done |
| 6. Our Ambassadors: list + detail + applications | done |
| 7. Rewards: catalog + create + redemptions queue | done |
| 8. Overview dashboard | done |
| 9. Realtime layer | done |
| 10. Seed script | done |
