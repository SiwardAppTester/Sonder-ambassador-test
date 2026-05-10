"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rewards as mockRewards } from "@/lib/mock/data";
import { mockDelay } from "@/hooks/mock-delay";
import type { Reward } from "@/lib/types";

export function useRewards() {
  return useQuery({
    queryKey: ["rewards", "list"],
    queryFn: async () => mockDelay(mockRewards.filter((r) => !r.archivedAt)),
  });
}

export function useReward(id: string | null) {
  return useQuery({
    queryKey: ["rewards", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const r = mockRewards.find((x) => x.id === id);
      if (!r) throw new Error("not found");
      return mockDelay(r);
    },
  });
}

export type CreateRewardInput = Omit<
  Reward,
  "id" | "createdAt" | "archivedAt" | "remainingStock"
> & {
  remainingStock?: number;
};

export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRewardInput) => {
      const created: Reward = {
        ...input,
        id: `r-${Math.random().toString(36).slice(2, 8)}`,
        remainingStock: input.remainingStock ?? input.totalStock,
        createdAt: new Date().toISOString(),
        archivedAt: null,
      };
      mockRewards.unshift(created);
      return mockDelay(created, 200);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}

export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Reward> }) => {
      const idx = mockRewards.findIndex((r) => r.id === input.id);
      if (idx === -1) throw new Error("not found");
      mockRewards[idx] = { ...mockRewards[idx], ...input.patch };
      return mockDelay(mockRewards[idx], 150);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}

export function useDeleteReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const idx = mockRewards.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("not found");
      mockRewards[idx] = { ...mockRewards[idx], archivedAt: new Date().toISOString() };
      return mockDelay(mockRewards[idx], 100);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rewards"] }),
  });
}
