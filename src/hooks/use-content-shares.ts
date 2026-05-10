"use client";

import { useQuery } from "@tanstack/react-query";
import { contentShares, shareMetrics, ambassadors } from "@/lib/mock/data";
import { mockDelay } from "@/hooks/mock-delay";

export function useContentShares(contentId: string | null) {
  return useQuery({
    queryKey: ["content-shares", contentId],
    enabled: !!contentId,
    queryFn: async () => {
      const shares = contentShares.filter((s) => s.campaignContentId === contentId);
      const enriched = shares.map((s) => {
        const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
        const a = ambassadors.find((x) => x.id === s.ambassadorId);
        return { share: s, metrics: m, ambassador: a };
      });
      return mockDelay(enriched);
    },
  });
}
