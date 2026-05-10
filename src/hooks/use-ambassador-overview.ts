"use client";

import { useQuery } from "@tanstack/react-query";
import {
  overviewHeroMetrics,
  overviewPointsFlow,
  overviewReachSeries,
  overviewTopAmbassadors,
  sharerDemographics,
  type OverviewRange,
} from "@/lib/mock/data";
import { mockDelay } from "@/hooks/mock-delay";
import { useOrganization } from "@/providers/organization-provider";

/**
 * Hook layer for the Overview dashboard. One hook per logical chunk of the
 * page so React Query can cache + invalidate independently.
 *
 * Range + campaign filter live in the page's URL/state and are passed in.
 */

export function useOverviewHeroMetrics(range: OverviewRange, campaignId?: string) {
  const org = useOrganization();
  return useQuery({
    queryKey: ["overview", "hero", range, campaignId, org.id],
    queryFn: () =>
      mockDelay(
        overviewHeroMetrics(range, org.instagramPaidBaselineCpv, org.platformShareCost, campaignId),
      ),
  });
}

export function useOverviewReachSeries(range: OverviewRange, campaignId?: string) {
  return useQuery({
    queryKey: ["overview", "reach-series", range, campaignId],
    queryFn: () => mockDelay(overviewReachSeries(range, campaignId)),
  });
}

export function useOverviewPointsFlow(range: OverviewRange, campaignId?: string) {
  return useQuery({
    queryKey: ["overview", "points-flow", range, campaignId],
    queryFn: () => mockDelay(overviewPointsFlow(range, campaignId)),
  });
}

export function useOverviewTopAmbassadors(
  range: OverviewRange,
  metric: "views" | "points",
  limit = 5,
) {
  return useQuery({
    queryKey: ["overview", "top-ambassadors", range, metric, limit],
    queryFn: () => mockDelay(overviewTopAmbassadors(range, metric, limit)),
  });
}

export function useSharerDemographics() {
  return useQuery({
    queryKey: ["overview", "demographics"],
    queryFn: () => mockDelay(sharerDemographics()),
  });
}
