"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { redemptions as mockRedemptions } from "@/lib/mock/data";
import { mockDelay } from "@/hooks/mock-delay";
import type { Redemption, RedemptionStatus } from "@/lib/types";

type Filters = {
  status?: RedemptionStatus | "all";
  ambassadorId?: string;
  rewardId?: string;
};

export function useRedemptions(filters: Filters = {}) {
  return useQuery({
    queryKey: ["redemptions", "list", filters],
    queryFn: async () => {
      const status = filters.status ?? "all";
      const filtered = mockRedemptions.filter((r) => {
        if (status !== "all" && r.status !== status) return false;
        if (filters.ambassadorId && r.ambassadorId !== filters.ambassadorId) return false;
        if (filters.rewardId && r.rewardId !== filters.rewardId) return false;
        return true;
      });
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return mockDelay(filtered);
    },
  });
}

export function useFulfillRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const idx = mockRedemptions.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("not found");
      const updated: Redemption = {
        ...mockRedemptions[idx],
        status: "fulfilled",
        fulfilledAt: new Date().toISOString(),
      };
      mockRedemptions[idx] = updated;
      return mockDelay(updated, 100);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["redemptions"] }),
  });
}
