/**
 * Sonder Ambassador feature — demo seeder.
 *
 * Writes a believable amount of demo data into a real Supabase project so
 * the admin dashboard has visuals from day one. Per brief §10:
 *   - 4 campaigns: 1 draft, 2 active (rich data), 1 ended
 *   - 8–12 content pieces per active campaign, mix images + videos
 *   - 15 ambassadors: 8 approved, 4 pending, 2 rejected (with reasons), 1 suspended
 *   - ~200 shares, power-law view distribution
 *   - 6 rewards with varied costs / stock (1 OOS, 1 low)
 *   - 8–10 redemptions in mixed states
 *
 * Usage:
 *   npm run seed -- --orgId=<uuid>          # writes demo data for this org
 *   npm run seed -- --orgId=<uuid> --reset  # deletes all demo rows for this org first
 *   npm run seed -- --new-org="My Demo Co"  # creates a new org and seeds it
 *
 * Required env (loaded from `.env.local` automatically):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Service-role bypasses RLS, which is intentional — these writes mirror
 * what the user-app side will do against the same tables.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// ─────────────────────────────────────────────────────────────────────────
// Env loading (light .env.local parser; avoids pulling dotenv as a dep)
// ─────────────────────────────────────────────────────────────────────────

function loadDotEnv(path: string) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const [, key, val] = m;
      if (process.env[key]) continue;
      process.env[key] = val.replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* file may not exist; that's fine */
  }
}
loadDotEnv(".env.local");
loadDotEnv(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
) as Record<string, string>;

let orgId = args.orgId ?? null;
const newOrgName = args["new-org"];
const reset = args.reset === "true";

// ─────────────────────────────────────────────────────────────────────────
// Helpers — deterministic-ish so re-runs produce stable data
// ─────────────────────────────────────────────────────────────────────────

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rng = seededRng(42);

const now = Date.now();
const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=900&q=70",
  "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=900&q=70",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=70",
  "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&q=70",
  "https://images.unsplash.com/photo-1560717845-968823efbee1?w=900&q=70",
  "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=900&q=70",
  "https://images.unsplash.com/photo-1485962398977-bdb0a8d7f6d4?w=900&q=70",
  "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=900&q=70",
];

const PROFILE_PICS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=70",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=70",
  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&q=70",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=70",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=70",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&q=70",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&q=70",
];

const REWARD_IMAGES = [
  "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&q=70",
  "https://images.unsplash.com/photo-1564594985645-4427056e22e2?w=600&q=70",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=70",
  "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=600&q=70",
  "https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=600&q=70",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&q=70",
];

function powerLawViews(): number {
  const u = rng() || 0.0001;
  return Math.floor(200 / Math.pow(u, 1.7));
}

function unambiguousCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(rng() * alphabet.length)]).join("");
  return `SONDER-${pick()}-${pick()}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Reset (optional)
// ─────────────────────────────────────────────────────────────────────────

async function resetOrg(targetOrgId: string) {
  console.log(`→ Reset: deleting demo rows for org ${targetOrgId}…`);
  // Order matters: child tables first.
  const tables = [
    "share_metrics",
    "content_shares",
    "redemptions",
    "points_ledger",
    "audit_log",
    "campaign_contents",
    "campaigns",
    "rewards",
    "ambassadors",
  ];
  for (const table of tables) {
    if (table === "share_metrics") {
      // share_metrics doesn't have organization_id directly; cascade from content_shares.
      // (FK is ON DELETE CASCADE, so deleting content_shares wipes them.)
      continue;
    }
    const { error } = await supabase.from(table).delete().eq("organization_id", targetOrgId);
    if (error) console.warn(`  ! ${table}: ${error.message}`);
    else console.log(`  - cleared ${table}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Insert helpers
// ─────────────────────────────────────────────────────────────────────────

async function insertOrUpdate<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) {
    console.error(`✗ Insert ${table} failed:`, error.message);
    process.exit(1);
  }
  console.log(`  + ${table}: ${data?.length ?? rows.length} rows`);
  return (data as T[]) ?? rows;
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  // Resolve / create the target org.
  if (newOrgName) {
    console.log(`→ Creating org "${newOrgName}"…`);
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name: newOrgName, theme_color: "#5b8a86" })
      .select()
      .single();
    if (error || !data) {
      console.error("✗ Create org failed:", error?.message);
      process.exit(1);
    }
    orgId = data.id as string;
    console.log(`  org id: ${orgId}`);
  } else if (!orgId) {
    console.error("Missing --orgId=<uuid> or --new-org=\"Org name\"");
    process.exit(1);
  }

  if (reset) {
    await resetOrg(orgId!);
  }

  // ── Ambassadors (15) ────────────────────────────────────────────────
  type Seed = {
    first: string; last: string; handle: string; followers: number;
    status: "approved" | "pending" | "rejected" | "suspended";
    country: string; age: number;
    rejectionReason?: string;
  };
  const seeds: Seed[] = [
    { first: "Maya", last: "Okafor", handle: "mayaeats", followers: 82_400, status: "approved", country: "NL", age: 27 },
    { first: "Liam", last: "Vega", handle: "liamvega", followers: 12_900, status: "approved", country: "ES", age: 24 },
    { first: "Suki", last: "Tanaka", handle: "sukitanaka", followers: 9_300, status: "approved", country: "JP", age: 31 },
    { first: "Noor", last: "El Amrani", handle: "nooramr", followers: 14_100, status: "approved", country: "MA", age: 26 },
    { first: "Theo", last: "Schmid", handle: "theoschmid", followers: 7_650, status: "approved", country: "DE", age: 29 },
    { first: "Carla", last: "Russo", handle: "carlar", followers: 1_780, status: "approved", country: "IT", age: 22 },
    { first: "Jonas", last: "Holm", handle: "jonash", followers: 1_240, status: "approved", country: "DK", age: 33 },
    { first: "Iris", last: "Costa", handle: "iriscosta", followers: 980, status: "approved", country: "PT", age: 25 },
    { first: "Ravi", last: "Mehta", handle: "ravimehta", followers: 6_400, status: "pending", country: "IN", age: 28 },
    { first: "Eline", last: "Bakker", handle: "elineb", followers: 3_100, status: "pending", country: "NL", age: 23 },
    { first: "Marc", last: "Lefevre", handle: "marclef", followers: 19_400, status: "pending", country: "FR", age: 30 },
    { first: "Aiko", last: "Sato", handle: "aikosato", followers: 8_700, status: "pending", country: "JP", age: 27 },
    { first: "Demi", last: "Klein", handle: "demiklein", followers: 220, status: "rejected", country: "DE", age: 21,
      rejectionReason: "Audience size too small for current programme." },
    { first: "Pedro", last: "Alves", handle: "pedroaa", followers: 4_800, status: "rejected", country: "PT", age: 35,
      rejectionReason: "Off-brand content history." },
    { first: "Zara", last: "Khan", handle: "zarak", followers: 22_300, status: "suspended", country: "GB", age: 28 },
  ];

  console.log("→ Seeding ambassadors…");
  const ambassadorRows = seeds.map((s, i) => ({
    id: randomUUID(),
    organization_id: orgId!,
    user_id: null,
    instagram_handle: s.handle,
    instagram_follower_count: s.followers,
    first_name: s.first,
    last_name: s.last,
    email: `${s.handle}@example.com`,
    age: s.age,
    country: s.country,
    profile_picture_url: PROFILE_PICS[i % PROFILE_PICS.length],
    status: s.status,
    rejection_reason: s.rejectionReason ?? null,
    applied_at: days(60 - i * 2),
    decided_at: s.status === "pending" ? null : days(55 - i * 2),
    points_balance: 0,
    lifetime_points_earned: 0,
  }));
  const ambassadors = await insertOrUpdate("ambassadors", ambassadorRows);
  const approvedAmbassadors = ambassadors.filter((a) => (a as { status: string }).status === "approved") as typeof ambassadorRows;

  // ── Rewards (6) ─────────────────────────────────────────────────────
  console.log("→ Seeding rewards…");
  const rewardRows = [
    { name: "Branded tote bag", description: "Limited-run cotton tote.", points_cost: 500, total_stock: 50, remaining_stock: 38, image_path: REWARD_IMAGES[0] },
    { name: "Welcome cocktail pair", description: "Two house cocktails on us.", points_cost: 800, total_stock: 100, remaining_stock: 71, image_path: REWARD_IMAGES[1] },
    { name: "Brunch for two", description: null, points_cost: 2_000, total_stock: 25, remaining_stock: 4, image_path: REWARD_IMAGES[2] },
    { name: "VIP rooftop pass", description: "Skip-the-line for one night.", points_cost: 5_000, total_stock: 10, remaining_stock: 0, image_path: REWARD_IMAGES[3] },
    { name: "Branded tee", description: null, points_cost: 1_200, total_stock: 30, remaining_stock: 22, image_path: REWARD_IMAGES[4] },
    { name: "Wine tasting flight", description: "Curated four-glass flight.", points_cost: 3_500, total_stock: 12, remaining_stock: 9, image_path: REWARD_IMAGES[5] },
  ].map((r) => ({
    id: randomUUID(),
    organization_id: orgId!,
    is_active: true,
    archived_at: null,
    ...r,
  }));
  const rewards = await insertOrUpdate("rewards", rewardRows);

  // ── Campaigns (4) ───────────────────────────────────────────────────
  console.log("→ Seeding campaigns…");
  const campaignDefs = [
    { name: "Summer rooftop nights", status: "active",  start: 20, end: -10, cap: 50_000, draft: false },
    { name: "Bottomless brunch tour", status: "active",  start: 45, end: -30, cap: 30_000, draft: false },
    { name: "Spring cocktail launch", status: "ended",   start: 120, end: 60, cap: 25_000, draft: false },
    { name: "Live DJ Friday series",  status: "draft",   start: null, end: null, cap: 20_000, draft: true },
  ] as const;

  const campaignRows = campaignDefs.map((c) => ({
    id: randomUUID(),
    organization_id: orgId!,
    name: c.name,
    description: `Demo campaign: ${c.name.toLowerCase()}.`,
    cover_image_path: c.draft ? null : STOCK_IMAGES[Math.floor(rng() * STOCK_IMAGES.length)],
    status: c.status,
    start_date: c.start === null ? null : days(c.start),
    end_date: c.end === null ? null : days(c.end as number),
    max_points_cap: c.cap,
    archived_at: null,
  }));
  const campaigns = await insertOrUpdate("campaigns", campaignRows);

  const activeCampaigns = (campaigns as typeof campaignRows).filter((c) =>
    ["active", "ended"].includes(c.status),
  );

  // ── Campaign content (8–12 per non-draft campaign) ──────────────────
  console.log("→ Seeding campaign content…");
  type ContentRow = ReturnType<typeof makeContent>[number];
  function makeContent(campaignId: string) {
    const count = 8 + Math.floor(rng() * 5); // 8–12
    return Array.from({ length: count }, (_, i) => ({
      id: randomUUID(),
      organization_id: orgId!,
      campaign_id: campaignId,
      type: i % 4 === 3 ? "video" : "image",
      file_path: STOCK_IMAGES[i % STOCK_IMAGES.length],
      thumbnail_path: STOCK_IMAGES[i % STOCK_IMAGES.length],
      file_size_bytes: 1_500_000 + i * 250_000,
      points_per_share: 50 + (i % 3) * 25,
      points_per_1k_views: 10 + (i % 2) * 5,
      caption_template: "Loving the vibes at @sonder ✨",
      hashtags: ["sonder", "rooftop", "summer"],
      instructions: i === 0 ? "Tag the location and use brand hashtags." : null,
      display_order: i,
    }));
  }
  const contents: ContentRow[] = [];
  for (const c of activeCampaigns) contents.push(...makeContent(c.id));
  await insertOrUpdate("campaign_contents", contents);

  // ── Content shares + share metrics (~200 total) ─────────────────────
  console.log("→ Seeding shares + metrics…");
  type ShareRow = {
    id: string;
    organization_id: string;
    campaign_content_id: string;
    campaign_id: string;
    ambassador_id: string;
    platform: "instagram";
    instagram_post_url: string;
    shared_at: string;
    points_awarded_for_share: number;
    points_per_1k_views_snapshot: number;
  };
  const shareRows: ShareRow[] = [];
  const metricRows: { content_share_id: string; organization_id: string; views: number; likes: number; comments: number; saves: number }[] = [];

  for (const content of contents) {
    const sharerCount = 4 + Math.floor(rng() * 8); // 4–11 sharers
    for (let i = 0; i < sharerCount && i < approvedAmbassadors.length; i++) {
      const amb = approvedAmbassadors[(i + content.id.length) % approvedAmbassadors.length];
      const shareId = randomUUID();
      shareRows.push({
        id: shareId,
        organization_id: orgId!,
        campaign_content_id: content.id,
        campaign_id: content.campaign_id,
        ambassador_id: amb.id,
        platform: "instagram",
        instagram_post_url: `https://instagram.com/p/${shareId.slice(0, 11)}`,
        shared_at: days(15 - Math.floor(rng() * 14)),
        points_awarded_for_share: content.points_per_share,
        points_per_1k_views_snapshot: content.points_per_1k_views,
      });
      metricRows.push({
        content_share_id: shareId,
        organization_id: orgId!,
        views: powerLawViews(),
        likes: Math.floor(rng() * 800),
        comments: Math.floor(rng() * 60),
        saves: Math.floor(rng() * 40),
      });
    }
  }
  await insertOrUpdate("content_shares", shareRows);
  await insertOrUpdate("share_metrics", metricRows);

  // ── Redemptions (8–10 mixed states) ─────────────────────────────────
  console.log("→ Seeding redemptions…");
  const redemptionRows = Array.from({ length: 9 }).map((_, i) => {
    const reward = rewards[i % rewards.length] as typeof rewardRows[number];
    const amb = approvedAmbassadors[i % approvedAmbassadors.length];
    const fulfilled = i % 3 !== 0;
    return {
      id: randomUUID(),
      organization_id: orgId!,
      ambassador_id: amb.id,
      reward_id: reward.id,
      code: unambiguousCode(),
      points_spent: reward.points_cost,
      status: fulfilled ? "fulfilled" : "pending",
      idempotency_key: randomUUID(),
      created_at: days(20 - i * 2),
      fulfilled_at: fulfilled ? days(18 - i * 2) : null,
      fulfilled_by: null,
    };
  });
  await insertOrUpdate("redemptions", redemptionRows);

  console.log("\n✓ Done.");
  console.log(`  org id: ${orgId}`);
  console.log(`  campaigns: ${campaigns.length}, content: ${contents.length}, shares: ${shareRows.length}, redemptions: ${redemptionRows.length}`);
  console.log("\nNote: the daily reconcile_ambassador_points() job will sync");
  console.log("ambassadors.points_balance from the ledger. To populate the");
  console.log("ledger now, run the share/milestone award functions:");
  console.log(`  select public.award_share_points(id) from public.content_shares where organization_id = '${orgId}';`);
  console.log(`  select public.award_view_milestones(id) from public.content_shares where organization_id = '${orgId}';`);
}

main().catch((err) => {
  console.error("✗ Seed failed:", err);
  process.exit(1);
});
