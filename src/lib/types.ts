/**
 * Domain types for the Ambassadors feature.
 *
 * These mirror the Supabase schema in 0001_ambassador_schema.sql but are
 * UI-shaped (camelCase, dates as ISO strings or Date instances). The hook
 * layer translates DB rows -> these types; mock data uses them directly.
 */

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "ended"
  | "archived";

export type CampaignContentType = "image" | "video";

export type AmbassadorStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "removed";

export type RedemptionStatus = "pending" | "fulfilled";

export type Campaign = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  maxPointsCap: number;
  pointsPerShare: number;
  pointsPer1kViews: number;
  hashtags: readonly string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type CampaignContent = {
  id: string;
  campaignId: string;
  type: CampaignContentType;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileSizeBytes: number;
  pointsPerShare: number;
  pointsPer1kViews: number;
  captionTemplate: string | null;
  hashtags: readonly string[];
  instructions: string | null;
  displayOrder: number | null;
  createdAt: string;
};

export type Ambassador = {
  id: string;
  organizationId: string;
  userId: string | null;
  instagramHandle: string | null;
  instagramFollowerCount: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  age: number | null;
  gender: "female" | "male" | "non-binary" | null;
  country: string | null;
  profilePictureUrl: string | null;
  status: AmbassadorStatus;
  rejectionReason: string | null;
  appliedAt: string;
  decidedAt: string | null;
  pointsBalance: number;
  lifetimePointsEarned: number;
  /**
   * Cross-festival history. Populated when this person has previously been
   * (or currently is) an ambassador for another organization. Useful on the
   * Requests tab so admins can see an applicant's track record before
   * approving — even though they've shared 0 content for *this* festival.
   * `priorOrganizationCount` of 0 (or undefined) means a fresh applicant.
   */
  priorOrganizationCount?: number;
  priorViews?: number;
  priorShares?: number;
  priorPointsEarned?: number;
};

export type Reward = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  totalStock: number;
  remainingStock: number;
  isActive: boolean;
  createdAt: string;
  archivedAt: string | null;
};

export type Redemption = {
  id: string;
  organizationId: string;
  ambassadorId: string;
  rewardId: string;
  code: string;
  pointsSpent: number;
  status: RedemptionStatus;
  createdAt: string;
  fulfilledAt: string | null;
};

export type ContentShare = {
  id: string;
  campaignContentId: string;
  campaignId: string;
  ambassadorId: string;
  instagramPostUrl: string;
  sharedAt: string;
  pointsAwardedForShare: number;
  pointsPer1kViewsSnapshot: number;
};

export type ShareMetrics = {
  contentShareId: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  lastSyncedAt: string;
};

/** Aggregated metrics for a campaign — what `useCampaignMetrics` returns. */
export type CampaignMetrics = {
  totalShares: number;
  totalReach: number;
  pointsAwarded: number;
  pointsCapPctUsed: number; // 0..1
  moneySaved: number;
  activeAmbassadors: number;
  avgViewsPerShare: number;
};

/** Top-of-list metrics on the Campaigns index page. */
export type CampaignsListMetrics = {
  activeCampaigns: { value: number; deltaVsPrev: number };
  pointsAwardedThisMonth: { value: number; deltaVsPrev: number };
  totalReachThisMonth: { value: number; deltaVsPrev: number };
  moneySavedThisMonth: { value: number; deltaVsPrev: number };
};
