"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useThrottledInvalidate, useRealtimeEnabled } from "@/hooks/use-throttled-invalidate";

/**
 * Realtime subscriptions wired into existing pages. Brief §8 lists exactly
 * four channels — these hooks implement them. All are no-ops in demo mode
 * (NEXT_PUBLIC_USE_MOCK_PROVIDERS=true) so the hook surface is safe to call
 * from any page, regardless of whether Supabase is wired up.
 *
 * Throttle: 1 invalidation per second per query key, per the brief.
 */

// ─────────────────────────────────────────────────────────────────────────
// 1. Campaign detail page — share + share-metrics changes scoped to a
// campaign.
// ─────────────────────────────────────────────────────────────────────────

export function useRealtimeCampaignMetrics(campaignId: string | null) {
  const enabled = useRealtimeEnabled();
  const invalidate = useThrottledInvalidate();

  useEffect(() => {
    if (!enabled || !campaignId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_shares",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () =>
          invalidate([
            ["campaigns", "metrics", campaignId],
            ["campaigns", "time-series", campaignId],
            ["campaigns", "top-content", campaignId, 5],
            ["campaigns", "top-sharers", campaignId, 10],
          ]),
      )
      .on(
        "postgres_changes",
        {
          // share_metrics rows don't carry campaign_id, so we listen broadly
          // and let the throttled invalidate dedupe. Acceptable because the
          // page mounts only one campaign at a time.
          event: "*",
          schema: "public",
          table: "share_metrics",
        },
        () =>
          invalidate([
            ["campaigns", "metrics", campaignId],
            ["campaigns", "time-series", campaignId],
            ["campaigns", "top-content", campaignId, 5],
          ]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, campaignId, invalidate]);
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Content detail page — metrics for a single share belonging to this
// content piece.
// ─────────────────────────────────────────────────────────────────────────

export function useRealtimeContentMetrics(contentId: string | null) {
  const enabled = useRealtimeEnabled();
  const invalidate = useThrottledInvalidate();

  useEffect(() => {
    if (!enabled || !contentId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`content-${contentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_shares",
          filter: `campaign_content_id=eq.${contentId}`,
        },
        () =>
          invalidate([
            ["content-shares", contentId],
            ["campaign-contents", "metrics", contentId],
            ["campaign-contents", "views-series", contentId],
          ]),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "share_metrics" },
        () =>
          invalidate([
            ["content-shares", contentId],
            ["campaign-contents", "metrics", contentId],
            ["campaign-contents", "views-series", contentId],
          ]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, contentId, invalidate]);
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Redemptions queue — new redemptions for the org. Brief calls for a
// "toast notification + table prepend" — we trigger the prepend via cache
// invalidation; toasts wire up when the toast system lands.
// ─────────────────────────────────────────────────────────────────────────

export function useRealtimeRedemptions(organizationId: string | null) {
  const enabled = useRealtimeEnabled();
  const invalidate = useThrottledInvalidate();

  useEffect(() => {
    if (!enabled || !organizationId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`redemptions-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "redemptions",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => invalidate([["redemptions"]]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, organizationId, invalidate]);
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Pending applications — drives the badge in the secondary sidebar.
// ─────────────────────────────────────────────────────────────────────────

export function useRealtimePendingApplications(organizationId: string | null) {
  const enabled = useRealtimeEnabled();
  const invalidate = useThrottledInvalidate();

  useEffect(() => {
    if (!enabled || !organizationId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`pending-apps-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ambassadors",
          filter: `organization_id=eq.${organizationId}`,
        },
        () =>
          invalidate([
            ["ambassadors", "pending-count"],
            ["ambassadors"],
          ]),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, organizationId, invalidate]);
}
