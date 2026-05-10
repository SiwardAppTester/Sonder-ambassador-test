/**
 * Demo data for the Ambassador feature, rendered when
 * NEXT_PUBLIC_USE_MOCK_PROVIDERS is true (default).
 *
 * Generated once per process to keep IDs stable across re-renders. Not
 * a substitute for the seed script in phase 10 — that one writes to the
 * real Supabase tables.
 */

import type {
  Ambassador,
  Campaign,
  CampaignContent,
  CampaignsListMetrics,
  CampaignMetrics,
  ContentShare,
  Redemption,
  Reward,
  ShareMetrics,
} from "@/lib/types";

const ORG = "00000000-0000-0000-0000-000000000001";

const now = Date.now();
const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

// ── Campaigns ────────────────────────────────────────────────────────────

export const campaigns: Campaign[] = [
  {
    id: "c-001",
    organizationId: ORG,
    name: "Summer rooftop nights",
    description: "Promote our rooftop bar reopening with a Reels-first push.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=900&q=70",
    status: "active",
    startDate: days(20),
    endDate: days(-10),
    maxPointsCap: 50_000,
    createdAt: days(25),
    updatedAt: days(2),
    archivedAt: null,
  },
  {
    id: "c-002",
    organizationId: ORG,
    name: "Bottomless brunch tour",
    description: "Saturday brunch tastings every weekend.",
    coverImageUrl:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=70",
    status: "active",
    startDate: days(45),
    endDate: days(-30),
    maxPointsCap: 30_000,
    createdAt: days(50),
    updatedAt: days(1),
    archivedAt: null,
  },
  {
    id: "c-003",
    organizationId: ORG,
    name: "Spring cocktail launch",
    description: null,
    coverImageUrl:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=70",
    status: "ended",
    startDate: days(120),
    endDate: days(60),
    maxPointsCap: 25_000,
    createdAt: days(125),
    updatedAt: days(60),
    archivedAt: null,
  },
  {
    id: "c-004",
    organizationId: ORG,
    name: "Live DJ Friday series",
    description: "Drafted but not launched yet.",
    coverImageUrl: null,
    status: "draft",
    startDate: null,
    endDate: null,
    maxPointsCap: 20_000,
    createdAt: days(3),
    updatedAt: days(3),
    archivedAt: null,
  },
];

// ── Content (per active campaign) ────────────────────────────────────────

const stockImages = [
  "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1560717845-968823efbee1?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1485962398977-bdb0a8d7f6d4?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=70",
];

function makeContent(campaignId: string, count: number): CampaignContent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `cc-${campaignId}-${i + 1}`,
    campaignId,
    type: i % 4 === 3 ? "video" : "image",
    fileUrl: stockImages[i % stockImages.length],
    thumbnailUrl: stockImages[i % stockImages.length],
    fileSizeBytes: 1_500_000 + i * 250_000,
    pointsPerShare: 50 + (i % 3) * 25,
    pointsPer1kViews: 10 + (i % 2) * 5,
    captionTemplate: "Loving the vibes at @sonder ✨",
    hashtags: ["sonder", "rooftop", "summer"],
    instructions: i === 0 ? "Tag the location and use brand hashtags." : null,
    displayOrder: i,
    createdAt: days(20 - i),
  }));
}

export const campaignContents: CampaignContent[] = [
  ...makeContent("c-001", 9),
  ...makeContent("c-002", 8),
  ...makeContent("c-003", 6),
];

// ── Ambassadors ──────────────────────────────────────────────────────────

const profilePics = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=70",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=70",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=70",
  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=200&q=70",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=70",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=70",
  "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=70",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=70",
];

type Seed = {
  first: string;
  last: string;
  handle: string;
  followers: number;
  status: Ambassador["status"];
  country: string;
  age: number;
  gender: Ambassador["gender"];
  pointsBalance: number;
  lifetimePoints: number;
  rejectionReason?: string;
  priorOrgs?: number;
  priorViews?: number;
  priorShares?: number;
  priorPoints?: number;
};

const seeds: Seed[] = [
  // 1 mid-tier (~80k)
  {
    first: "Maya", last: "Okafor", handle: "mayaeats", followers: 82_400,
    status: "approved", country: "NL", age: 27, gender: "female", pointsBalance: 4_350, lifetimePoints: 8_700,
  },
  // micro (~5–15k)
  {
    first: "Liam", last: "Vega", handle: "liamvega", followers: 12_900,
    status: "approved", country: "ES", age: 24, gender: "male", pointsBalance: 1_680, lifetimePoints: 3_400,
  },
  {
    first: "Suki", last: "Tanaka", handle: "sukitanaka", followers: 9_300,
    status: "approved", country: "JP", age: 31, gender: "female", pointsBalance: 920, lifetimePoints: 2_120,
  },
  {
    first: "Noor", last: "El Amrani", handle: "noor.amr", followers: 14_100,
    status: "approved", country: "MA", age: 26, gender: "female", pointsBalance: 2_450, lifetimePoints: 5_500,
  },
  {
    first: "Theo", last: "Schmid", handle: "theoschmid", followers: 7_650,
    status: "approved", country: "DE", age: 29, gender: "male", pointsBalance: 760, lifetimePoints: 1_900,
  },
  // small (<2k)
  {
    first: "Carla", last: "Russo", handle: "carla.r", followers: 1_780,
    status: "approved", country: "IT", age: 22, gender: "female", pointsBalance: 340, lifetimePoints: 800,
  },
  {
    first: "Jonas", last: "Holm", handle: "jonash", followers: 1_240,
    status: "approved", country: "DK", age: 33, gender: "male", pointsBalance: 220, lifetimePoints: 600,
  },
  {
    first: "Iris", last: "Costa", handle: "iriscosta", followers: 980,
    status: "approved", country: "PT", age: 25, gender: "non-binary", pointsBalance: 110, lifetimePoints: 350,
  },
  // pending
  { first: "Ravi",   last: "Mehta",  handle: "ravimehta",  followers: 6_400,
    status: "pending", country: "IN", age: 28, gender: "male", pointsBalance: 0, lifetimePoints: 0 },
  { first: "Eline",  last: "Bakker", handle: "elineb",     followers: 3_100,
    status: "pending", country: "NL", age: 23, gender: "female", pointsBalance: 0, lifetimePoints: 0 },
  // Marc has been an ambassador at 2 other festivals — strong track record.
  { first: "Marc",   last: "Lefèvre",handle: "marclef",    followers: 19_400,
    status: "pending", country: "FR", age: 30, gender: "male", pointsBalance: 0, lifetimePoints: 0,
    priorOrgs: 2, priorViews: 412_000, priorShares: 38, priorPoints: 9_800 },
  // Aiko has prior history at 1 other festival.
  { first: "Aiko",   last: "Sato",   handle: "aikosato",   followers: 8_700,
    status: "pending", country: "JP", age: 27, gender: "female", pointsBalance: 0, lifetimePoints: 0,
    priorOrgs: 1, priorViews: 96_000, priorShares: 14, priorPoints: 2_750 },
  // rejected
  { first: "Demi",   last: "Klein",  handle: "demiklein",  followers: 220,
    status: "rejected", country: "DE", age: 21, gender: "female", pointsBalance: 0, lifetimePoints: 0,
    rejectionReason: "Audience size too small for current programme." },
  { first: "Pedro",  last: "Alves",  handle: "pedroaa",    followers: 4_800,
    status: "rejected", country: "PT", age: 35, gender: "male", pointsBalance: 0, lifetimePoints: 0,
    rejectionReason: "Off-brand content history." },
  // suspended
  { first: "Zara",   last: "Khan",   handle: "zarak",      followers: 22_300,
    status: "suspended", country: "GB", age: 28, gender: "female", pointsBalance: 1_100, lifetimePoints: 2_400 },
];

export const ambassadors: Ambassador[] = seeds.map((s, i) => ({
  id: `a-${(i + 1).toString().padStart(3, "0")}`,
  organizationId: ORG,
  userId: `u-${(i + 1).toString().padStart(3, "0")}`,
  instagramHandle: s.handle,
  instagramFollowerCount: s.followers,
  firstName: s.first,
  lastName: s.last,
  email: `${s.handle}@example.com`,
  age: s.age,
  gender: s.gender,
  country: s.country,
  profilePictureUrl: profilePics[i % profilePics.length],
  status: s.status,
  rejectionReason: s.rejectionReason ?? null,
  appliedAt: days(60 - i * 2),
  decidedAt: s.status === "pending" ? null : days(55 - i * 2),
  pointsBalance: s.pointsBalance,
  lifetimePointsEarned: s.lifetimePoints,
  priorOrganizationCount: s.priorOrgs,
  priorViews: s.priorViews,
  priorShares: s.priorShares,
  priorPointsEarned: s.priorPoints,
}));

// ── Shares + metrics (power-law view distribution) ───────────────────────

function powerLawViews(rng: () => number): number {
  // Most shares get a few hundred; a long tail goes 50k+. Inverse-CDF of a
  // shifted Pareto-ish distribution.
  const u = rng();
  return Math.floor(200 / Math.pow(u, 1.7));
}

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rng = seededRng(42);

export const contentShares: ContentShare[] = [];
export const shareMetrics: ShareMetrics[] = [];

for (const content of campaignContents) {
  const sharerCount = 3 + Math.floor(rng() * 8); // 3–10 sharers per content
  const approvedAmbassadors = ambassadors.filter((a) => a.status === "approved");
  for (let i = 0; i < sharerCount && i < approvedAmbassadors.length; i++) {
    const ambassador = approvedAmbassadors[(i + content.id.length) % approvedAmbassadors.length];
    const shareId = `s-${content.id}-${ambassador.id}`;
    const sharedAt = days(15 - Math.floor(rng() * 14));
    contentShares.push({
      id: shareId,
      campaignContentId: content.id,
      campaignId: content.campaignId,
      ambassadorId: ambassador.id,
      instagramPostUrl: `https://instagram.com/p/${shareId.slice(0, 11)}`,
      sharedAt,
      pointsAwardedForShare: content.pointsPerShare,
      pointsPer1kViewsSnapshot: content.pointsPer1kViews,
    });
    shareMetrics.push({
      contentShareId: shareId,
      views: powerLawViews(rng),
      likes: Math.floor(rng() * 800),
      comments: Math.floor(rng() * 60),
      saves: Math.floor(rng() * 40),
      lastSyncedAt: days(0),
    });
  }
}

// ── Rewards ──────────────────────────────────────────────────────────────

const rewardImages = [
  "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1564594985645-4427056e22e2?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1553531384-cc64ac80f931?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=70",
];

export const rewards: Reward[] = [
  { id: "r-001", organizationId: ORG, name: "Branded tote bag", description: "Limited-run cotton tote.",
    imageUrl: rewardImages[0], pointsCost: 500, totalStock: 50, remainingStock: 38,
    isActive: true, createdAt: days(40), archivedAt: null },
  { id: "r-002", organizationId: ORG, name: "Welcome cocktail pair", description: "Two house cocktails on us.",
    imageUrl: rewardImages[1], pointsCost: 800, totalStock: 100, remainingStock: 71,
    isActive: true, createdAt: days(40), archivedAt: null },
  { id: "r-003", organizationId: ORG, name: "Brunch for two", description: null,
    imageUrl: rewardImages[2], pointsCost: 2_000, totalStock: 25, remainingStock: 4,
    isActive: true, createdAt: days(40), archivedAt: null },
  { id: "r-004", organizationId: ORG, name: "VIP rooftop pass", description: "Skip-the-line for one night.",
    imageUrl: rewardImages[3], pointsCost: 5_000, totalStock: 10, remainingStock: 0,
    isActive: true, createdAt: days(40), archivedAt: null },
  { id: "r-005", organizationId: ORG, name: "Branded tee", description: null,
    imageUrl: rewardImages[4], pointsCost: 1_200, totalStock: 30, remainingStock: 22,
    isActive: true, createdAt: days(40), archivedAt: null },
  { id: "r-006", organizationId: ORG, name: "Wine tasting flight", description: "Curated four-glass flight.",
    imageUrl: rewardImages[5], pointsCost: 3_500, totalStock: 12, remainingStock: 9,
    isActive: true, createdAt: days(40), archivedAt: null },
];

// ── Redemptions ──────────────────────────────────────────────────────────

export const redemptions: Redemption[] = [
  { id: "rd-001", organizationId: ORG, ambassadorId: "a-001", rewardId: "r-002",
    code: "SONDER-K7P3-J9MX", pointsSpent: 800, status: "fulfilled",
    createdAt: days(15), fulfilledAt: days(13) },
  { id: "rd-002", organizationId: ORG, ambassadorId: "a-002", rewardId: "r-001",
    code: "SONDER-Q2NM-T4UV", pointsSpent: 500, status: "fulfilled",
    createdAt: days(12), fulfilledAt: days(10) },
  { id: "rd-003", organizationId: ORG, ambassadorId: "a-001", rewardId: "r-003",
    code: "SONDER-D5HK-W7ZY", pointsSpent: 2_000, status: "pending",
    createdAt: days(2), fulfilledAt: null },
  { id: "rd-004", organizationId: ORG, ambassadorId: "a-004", rewardId: "r-005",
    code: "SONDER-B8FT-R3PQ", pointsSpent: 1_200, status: "pending",
    createdAt: days(1), fulfilledAt: null },
  { id: "rd-005", organizationId: ORG, ambassadorId: "a-003", rewardId: "r-001",
    code: "SONDER-N6MV-X2KH", pointsSpent: 500, status: "fulfilled",
    createdAt: days(8), fulfilledAt: days(7) },
  { id: "rd-006", organizationId: ORG, ambassadorId: "a-005", rewardId: "r-002",
    code: "SONDER-J3WX-P9RT", pointsSpent: 800, status: "fulfilled",
    createdAt: days(20), fulfilledAt: days(19) },
  { id: "rd-007", organizationId: ORG, ambassadorId: "a-006", rewardId: "r-001",
    code: "SONDER-Y5KQ-M2VB", pointsSpent: 500, status: "pending",
    createdAt: days(0), fulfilledAt: null },
  { id: "rd-008", organizationId: ORG, ambassadorId: "a-002", rewardId: "r-005",
    code: "SONDER-T7HD-N4WC", pointsSpent: 1_200, status: "fulfilled",
    createdAt: days(25), fulfilledAt: days(24) },
];

// ── Aggregations exposed to hooks ────────────────────────────────────────

export function aggregateCampaignMetrics(
  campaign: Campaign,
  cpv: number,
  shareCost: number,
): CampaignMetrics {
  const shares = contentShares.filter((s) => s.campaignId === campaign.id);
  const totalShares = shares.length;

  const totalReach = shares.reduce((acc, s) => {
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    return acc + (m?.views ?? 0);
  }, 0);

  const pointsAwarded = shares.reduce((acc, s) => {
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    const milestones = Math.floor((m?.views ?? 0) / 1000);
    return acc + s.pointsAwardedForShare + milestones * s.pointsPer1kViewsSnapshot;
  }, 0);

  const pointsCapPctUsed = Math.min(1, pointsAwarded / campaign.maxPointsCap);
  const moneySaved = totalReach * cpv - totalShares * shareCost;
  const activeAmbassadors = new Set(shares.map((s) => s.ambassadorId)).size;
  const avgViewsPerShare = totalShares === 0 ? 0 : totalReach / totalShares;

  return {
    totalShares,
    totalReach,
    pointsAwarded,
    pointsCapPctUsed,
    moneySaved,
    activeAmbassadors,
    avgViewsPerShare,
  };
}

/** Time-series for a campaign: shares per day + views per day. */
export function campaignTimeSeries(campaignId: string): {
  date: string;
  shares: number;
  views: number;
}[] {
  const shares = contentShares.filter((s) => s.campaignId === campaignId);

  const buckets = new Map<string, { shares: number; views: number }>();
  for (const s of shares) {
    const day = s.sharedAt.slice(0, 10); // YYYY-MM-DD
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    const cur = buckets.get(day) ?? { shares: 0, views: 0 };
    cur.shares += 1;
    cur.views += m?.views ?? 0;
    buckets.set(day, cur);
  }

  return [...buckets.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Top N content pieces in a campaign, by total views across all shares. */
export function topContentByViews(
  campaignId: string,
  limit = 5,
): { content: CampaignContent; views: number; shares: number }[] {
  const contents = campaignContents.filter((c) => c.campaignId === campaignId);
  return contents
    .map((content) => {
      const shares = contentShares.filter((s) => s.campaignContentId === content.id);
      const views = shares.reduce((acc, s) => {
        const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
        return acc + (m?.views ?? 0);
      }, 0);
      return { content, views, shares: shares.length };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/** Top N ambassadors in a campaign by share count, with points earned. */
export function topSharersForCampaign(
  campaignId: string,
  limit = 10,
): { ambassador: Ambassador; shareCount: number; pointsEarned: number }[] {
  const shares = contentShares.filter((s) => s.campaignId === campaignId);
  const byAmb = new Map<string, { shareCount: number; pointsEarned: number }>();

  for (const s of shares) {
    const cur = byAmb.get(s.ambassadorId) ?? { shareCount: 0, pointsEarned: 0 };
    cur.shareCount += 1;
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    const milestones = Math.floor((m?.views ?? 0) / 1000);
    cur.pointsEarned += s.pointsAwardedForShare + milestones * s.pointsPer1kViewsSnapshot;
    byAmb.set(s.ambassadorId, cur);
  }

  return [...byAmb.entries()]
    .map(([id, v]) => {
      const ambassador = ambassadors.find((a) => a.id === id)!;
      return { ambassador, ...v };
    })
    .filter((x) => x.ambassador)
    .sort((a, b) => b.shareCount - a.shareCount)
    .slice(0, limit);
}

/** Time-series for a single content piece: views per day, derived from
 * power-law sampled metrics. We don't store a true history per-share, so
 * synthesize a plausible curve back to the share date. */
export function contentViewsOverTime(contentId: string): {
  date: string;
  views: number;
}[] {
  const shares = contentShares.filter((s) => s.campaignContentId === contentId);
  const totalViews = shares.reduce((acc, s) => {
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    return acc + (m?.views ?? 0);
  }, 0);
  if (totalViews === 0) return [];

  // Synthesize 14 days; concentrate views in the first 3 days then a long tail.
  const decay = [0.32, 0.22, 0.14, 0.08, 0.06, 0.04, 0.03, 0.025, 0.02, 0.018, 0.015, 0.012, 0.01, 0.008];
  const weightSum = decay.reduce((a, b) => a + b, 0);

  return decay.map((w, i) => ({
    date: new Date(now - (decay.length - i - 1) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    views: Math.round((w / weightSum) * totalViews),
  }));
}

/** Aggregate metrics for a single content piece, used on its detail page. */
export function aggregateContentMetrics(
  contentId: string,
  cpv: number,
  shareCost: number,
): {
  totalShares: number;
  uniqueSharers: number;
  reach: number;
  engagementRate: number; // 0..1
  moneySaved: number;
  pointsAwarded: number;
} {
  const shares = contentShares.filter((s) => s.campaignContentId === contentId);
  const totalShares = shares.length;
  const uniqueSharers = new Set(shares.map((s) => s.ambassadorId)).size;

  let reach = 0;
  let interactions = 0;
  let pointsAwarded = 0;
  for (const s of shares) {
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    const v = m?.views ?? 0;
    reach += v;
    interactions += (m?.likes ?? 0) + (m?.comments ?? 0) + (m?.saves ?? 0);
    const milestones = Math.floor(v / 1000);
    pointsAwarded += s.pointsAwardedForShare + milestones * s.pointsPer1kViewsSnapshot;
  }

  const engagementRate = reach === 0 ? 0 : interactions / reach;
  const moneySaved = reach * cpv - totalShares * shareCost;

  return { totalShares, uniqueSharers, reach, engagementRate, moneySaved, pointsAwarded };
}

/** Time-series of an ambassador's shares + views over the last N days. */
export function ambassadorActivity(
  ambassadorId: string,
  daysBack = 90,
): { date: string; shares: number; views: number }[] {
  const since = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const shares = contentShares.filter(
    (s) => s.ambassadorId === ambassadorId && new Date(s.sharedAt).getTime() >= since,
  );

  const buckets = new Map<string, { shares: number; views: number }>();
  for (const s of shares) {
    const day = s.sharedAt.slice(0, 10);
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    const cur = buckets.get(day) ?? { shares: 0, views: 0 };
    cur.shares += 1;
    cur.views += m?.views ?? 0;
    buckets.set(day, cur);
  }

  return [...buckets.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Every content piece an ambassador has shared, with the share + view count. */
export function ambassadorSharedContent(ambassadorId: string): {
  share: ContentShare;
  content: CampaignContent | undefined;
  campaign: Campaign | undefined;
  views: number;
}[] {
  const shares = contentShares.filter((s) => s.ambassadorId === ambassadorId);
  return shares
    .map((share) => {
      const content = campaignContents.find((c) => c.id === share.campaignContentId);
      const campaign = campaigns.find((c) => c.id === share.campaignId);
      const m = shareMetrics.find((sm) => sm.contentShareId === share.id);
      return { share, content, campaign, views: m?.views ?? 0 };
    })
    .sort((a, b) => new Date(b.share.sharedAt).getTime() - new Date(a.share.sharedAt).getTime());
}

/** Aggregate lifetime metrics for an ambassador. */
export function ambassadorMetrics(
  ambassadorId: string,
  cpv: number,
  shareCost: number,
): {
  totalShares: number;
  totalReach: number;
  pointsEarned: number;
  moneyGenerated: number;
} {
  const shares = contentShares.filter((s) => s.ambassadorId === ambassadorId);
  let totalReach = 0;
  let pointsEarned = 0;
  for (const s of shares) {
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    const v = m?.views ?? 0;
    totalReach += v;
    const milestones = Math.floor(v / 1000);
    pointsEarned += s.pointsAwardedForShare + milestones * s.pointsPer1kViewsSnapshot;
  }
  const moneyGenerated = totalReach * cpv - shares.length * shareCost;
  return {
    totalShares: shares.length,
    totalReach,
    pointsEarned,
    moneyGenerated,
  };
}

/** Pending application count, used by the secondary sidebar badge later. */
export function pendingApplicationCount(): number {
  return ambassadors.filter((a) => a.status === "pending").length;
}

// ─────────────────────────────────────────────────────────────────────────
// Overview / dashboard aggregations
// ─────────────────────────────────────────────────────────────────────────

export type OverviewRange = "7d" | "30d" | "90d";

function rangeBoundary(range: OverviewRange): { since: number; prevSince: number; prevUntil: number } {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const prevUntil = since;
  const prevSince = since - days * 24 * 60 * 60 * 1000;
  return { since, prevUntil, prevSince };
}

function metricDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 1;
  return (current - previous) / previous;
}

/** Hero metrics row for the Overview page. Deltas compare current vs the
 * preceding equivalent period (e.g. last 30 days vs the 30 before). */
export function overviewHeroMetrics(
  range: OverviewRange,
  cpv: number,
  shareCost: number,
  campaignId?: string,
): {
  totalReach: { value: number; delta: number };
  totalShares: { value: number; delta: number };
  pointsDistributed: { value: number; delta: number };
  moneySaved: { value: number; delta: number };
  moneySpentOnShares: { value: number; delta: number };
  activeAmbassadors: { value: number; delta: number };
} {
  const { since, prevSince, prevUntil } = rangeBoundary(range);

  const inRange = (ts: string, from: number, to: number) => {
    const t = new Date(ts).getTime();
    return t >= from && t < to;
  };

  function bucket(from: number, to: number) {
    const shares = contentShares.filter(
      (s) => inRange(s.sharedAt, from, to) && (!campaignId || s.campaignId === campaignId),
    );
    let reach = 0;
    let points = 0;
    for (const s of shares) {
      const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
      const v = m?.views ?? 0;
      reach += v;
      const milestones = Math.floor(v / 1000);
      points += s.pointsAwardedForShare + milestones * s.pointsPer1kViewsSnapshot;
    }
    return {
      reach,
      shares: shares.length,
      points,
      activeAmbassadors: new Set(shares.map((s) => s.ambassadorId)).size,
      moneySaved: reach * cpv - shares.length * shareCost,
      moneySpent: shares.length * shareCost,
    };
  }

  const cur = bucket(since, Date.now());
  const prev = bucket(prevSince, prevUntil);

  return {
    totalReach: { value: cur.reach, delta: metricDelta(cur.reach, prev.reach) },
    totalShares: { value: cur.shares, delta: metricDelta(cur.shares, prev.shares) },
    pointsDistributed: { value: cur.points, delta: metricDelta(cur.points, prev.points) },
    moneySaved: { value: cur.moneySaved, delta: metricDelta(cur.moneySaved, prev.moneySaved) },
    moneySpentOnShares: {
      value: cur.moneySpent,
      delta: metricDelta(cur.moneySpent, prev.moneySpent),
    },
    activeAmbassadors: {
      value: cur.activeAmbassadors,
      delta: metricDelta(cur.activeAmbassadors, prev.activeAmbassadors),
    },
  };
}

/** Day-by-day reach for the line chart, scoped to range + optional campaign. */
export function overviewReachSeries(
  range: OverviewRange,
  campaignId?: string,
): { date: string; reach: number }[] {
  const { since } = rangeBoundary(range);
  const buckets = new Map<string, number>();

  for (const s of contentShares) {
    if (campaignId && s.campaignId !== campaignId) continue;
    const ts = new Date(s.sharedAt).getTime();
    if (ts < since) continue;
    const day = s.sharedAt.slice(0, 10);
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    buckets.set(day, (buckets.get(day) ?? 0) + (m?.views ?? 0));
  }

  return [...buckets.entries()]
    .map(([date, reach]) => ({ date, reach }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Stacked area: points awarded (in) vs points redeemed (out, negative). */
export function overviewPointsFlow(
  range: OverviewRange,
  campaignId?: string,
): { date: string; awarded: number; redeemed: number }[] {
  const { since } = rangeBoundary(range);
  const buckets = new Map<string, { awarded: number; redeemed: number }>();

  // Awards (from shares + milestones); we don't track per-day granularity for
  // milestones, so attribute them to the share's date — close enough for the
  // demo, and the real Supabase ledger has timestamps per row.
  for (const s of contentShares) {
    if (campaignId && s.campaignId !== campaignId) continue;
    const ts = new Date(s.sharedAt).getTime();
    if (ts < since) continue;
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    const milestones = Math.floor((m?.views ?? 0) / 1000);
    const awarded =
      s.pointsAwardedForShare + milestones * s.pointsPer1kViewsSnapshot;
    const day = s.sharedAt.slice(0, 10);
    const cur = buckets.get(day) ?? { awarded: 0, redeemed: 0 };
    cur.awarded += awarded;
    buckets.set(day, cur);
  }

  // Redemptions are global (not campaign-scoped). When a campaign filter is
  // active we still surface redemptions for context — they're part of the
  // org's points flow, not a campaign's.
  for (const r of redemptions) {
    const ts = new Date(r.createdAt).getTime();
    if (ts < since) continue;
    const day = r.createdAt.slice(0, 10);
    const cur = buckets.get(day) ?? { awarded: 0, redeemed: 0 };
    cur.redeemed += r.pointsSpent;
    buckets.set(day, cur);
  }

  return [...buckets.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Top-N ambassadors in the range, by either views or points. */
export function overviewTopAmbassadors(
  range: OverviewRange,
  metric: "views" | "points",
  limit = 5,
): { ambassador: Ambassador; value: number }[] {
  const { since } = rangeBoundary(range);
  const totals = new Map<string, number>();

  for (const s of contentShares) {
    const ts = new Date(s.sharedAt).getTime();
    if (ts < since) continue;
    const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
    const views = m?.views ?? 0;
    const milestones = Math.floor(views / 1000);
    const points = s.pointsAwardedForShare + milestones * s.pointsPer1kViewsSnapshot;
    totals.set(
      s.ambassadorId,
      (totals.get(s.ambassadorId) ?? 0) + (metric === "views" ? views : points),
    );
  }

  return [...totals.entries()]
    .map(([id, value]) => {
      const ambassador = ambassadors.find((a) => a.id === id);
      return ambassador ? { ambassador, value } : null;
    })
    .filter(<T,>(x: T | null): x is T => x !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Sharer demographics donut data. Source: approved ambassadors. */
export function sharerDemographics(): {
  ageBand: { label: string; value: number }[];
  country: { label: string; value: number }[];
} {
  const approved = ambassadors.filter((a) => a.status === "approved");

  const ageBuckets: Record<string, number> = {
    "18–24": 0, "25–34": 0, "35–44": 0, "45–54": 0, "55+": 0, "Unknown": 0,
  };
  for (const a of approved) {
    if (!a.age) ageBuckets.Unknown++;
    else if (a.age < 25) ageBuckets["18–24"]++;
    else if (a.age < 35) ageBuckets["25–34"]++;
    else if (a.age < 45) ageBuckets["35–44"]++;
    else if (a.age < 55) ageBuckets["45–54"]++;
    else ageBuckets["55+"]++;
  }

  const countryCounts = new Map<string, number>();
  for (const a of approved) {
    const c = a.country ?? "??";
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
  }

  // Top 3 countries; lump the rest into "Other" so the donut never shows
  // more than 4 slices and the legend stays scannable.
  const sortedCountries = [...countryCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topCountries = sortedCountries.slice(0, 3);
  const otherCountryCount = sortedCountries.slice(3).reduce((acc, [, n]) => acc + n, 0);

  return {
    ageBand: Object.entries(ageBuckets)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([label, value]) => ({ label, value })),
    country: [
      ...topCountries.map(([label, value]) => ({ label, value })),
      ...(otherCountryCount > 0 ? [{ label: "Other", value: otherCountryCount }] : []),
    ],
  };
}

export function aggregateListMetrics(
  cpv: number,
  shareCost: number,
): CampaignsListMetrics {
  // "this month" simplified to "all data"; real impl scopes by date.
  const totals = campaigns
    .filter((c) => c.status !== "draft" && c.status !== "archived")
    .reduce(
      (acc, c) => {
        const m = aggregateCampaignMetrics(c, cpv, shareCost);
        acc.points += m.pointsAwarded;
        acc.reach += m.totalReach;
        acc.money += m.moneySaved;
        return acc;
      },
      { points: 0, reach: 0, money: 0 },
    );

  return {
    activeCampaigns: {
      value: campaigns.filter((c) => c.status === "active").length,
      deltaVsPrev: 1,
    },
    pointsAwardedThisMonth: { value: totals.points, deltaVsPrev: 0.18 },
    totalReachThisMonth: { value: totals.reach, deltaVsPrev: 0.31 },
    moneySavedThisMonth: { value: totals.money, deltaVsPrev: 0.24 },
  };
}
