"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  campaigns as mockCampaigns,
  aggregateCampaignMetrics,
  aggregateListMetrics,
  campaignTimeSeries,
  topContentByViews,
  topSharersForCampaign,
} from "@/lib/mock/data";
import { mockDelay } from "@/hooks/mock-delay";
import { useOrganization } from "@/providers/organization-provider";
import type { Campaign, CampaignMetrics, CampaignsListMetrics, CampaignStatus } from "@/lib/types";

/**
 * Hook layer mirrors the brief's resource-per-file pattern. Each query
 * key starts with `["campaigns", ...]` so we can invalidate broadly on
 * mutation. Today these read from `mock/data.ts`; swap the implementations
 * to call the hand-written Supabase clients later without touching pages.
 */

export type CampaignFilters = {
  search?: string;
  status?: CampaignStatus | "all";
  sort?: "recent" | "most_points" | "ending_soon";
};

export function useCampaigns(filters: CampaignFilters = {}) {
  return useQuery({
    queryKey: ["campaigns", "list", filters],
    queryFn: async () => {
      const search = filters.search?.trim().toLowerCase() ?? "";
      const status = filters.status ?? "all";
      const sort = filters.sort ?? "recent";

      const filtered = mockCampaigns.filter((c) => {
        if (c.archivedAt) return false;
        if (status !== "all" && c.status !== status) return false;
        if (search && !c.name.toLowerCase().includes(search)) return false;
        return true;
      });

      const sorted = [...filtered].sort((a, b) => {
        switch (sort) {
          case "ending_soon":
            return (
              (a.endDate ? new Date(a.endDate).getTime() : Infinity) -
              (b.endDate ? new Date(b.endDate).getTime() : Infinity)
            );
          case "most_points":
            return b.maxPointsCap - a.maxPointsCap;
          case "recent":
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });

      return mockDelay(sorted);
    },
  });
}

export function useCampaign(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaigns", "detail", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const found = mockCampaigns.find((c) => c.id === campaignId);
      if (!found) throw new Error(`Campaign ${campaignId} not found`);
      return mockDelay(found);
    },
  });
}

export function useCampaignsListMetrics() {
  const org = useOrganization();
  return useQuery<CampaignsListMetrics>({
    queryKey: ["campaigns", "list-metrics", org.id],
    queryFn: () =>
      mockDelay(aggregateListMetrics(org.instagramPaidBaselineCpv, org.platformShareCost)),
  });
}

export function useCampaignMetrics(campaignId: string | null) {
  const org = useOrganization();
  return useQuery<CampaignMetrics | null>({
    queryKey: ["campaigns", "metrics", campaignId, org.id],
    enabled: !!campaignId,
    queryFn: async () => {
      const c = mockCampaigns.find((x) => x.id === campaignId);
      if (!c) return null;
      return mockDelay(
        aggregateCampaignMetrics(c, org.instagramPaidBaselineCpv, org.platformShareCost),
      );
    },
  });
}

export function useCampaignTimeSeries(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaigns", "time-series", campaignId],
    enabled: !!campaignId,
    queryFn: () => mockDelay(campaignTimeSeries(campaignId!)),
  });
}

export function useTopContentByViews(campaignId: string | null, limit = 5) {
  return useQuery({
    queryKey: ["campaigns", "top-content", campaignId, limit],
    enabled: !!campaignId,
    queryFn: () => mockDelay(topContentByViews(campaignId!, limit)),
  });
}

export function useTopSharersForCampaign(campaignId: string | null, limit = 10) {
  return useQuery({
    queryKey: ["campaigns", "top-sharers", campaignId, limit],
    enabled: !!campaignId,
    queryFn: () => mockDelay(topSharersForCampaign(campaignId!, limit)),
  });
}

// ── Mutations ────────────────────────────────────────────────────────────

export type CreateCampaignInput = {
  name: string;
  description?: string;
  coverImageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  maxPointsCap: number;
};

export function useCreateCampaign() {
  const qc = useQueryClient();
  const org = useOrganization();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const created: Campaign = {
        id: `c-${Math.random().toString(36).slice(2, 8)}`,
        organizationId: org.id,
        name: input.name,
        description: input.description ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        status: "draft",
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        maxPointsCap: input.maxPointsCap,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archivedAt: null,
      };
      mockCampaigns.unshift(created);
      return mockDelay(created, 200);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Campaign> }) => {
      const idx = mockCampaigns.findIndex((c) => c.id === input.id);
      if (idx === -1) throw new Error("not found");
      mockCampaigns[idx] = {
        ...mockCampaigns[idx],
        ...input.patch,
        updatedAt: new Date().toISOString(),
      };
      return mockDelay(mockCampaigns[idx], 150);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: CampaignStatus }) => {
      const idx = mockCampaigns.findIndex((c) => c.id === input.id);
      if (idx === -1) throw new Error("not found");
      mockCampaigns[idx] = { ...mockCampaigns[idx], status: input.status };
      return mockDelay(mockCampaigns[idx], 100);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const idx = mockCampaigns.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("not found");
      mockCampaigns[idx] = { ...mockCampaigns[idx], archivedAt: new Date().toISOString() };
      return mockDelay(mockCampaigns[idx], 100);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}
