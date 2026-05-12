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
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Campaign, CampaignMetrics, CampaignsListMetrics, CampaignStatus } from "@/lib/types";

/**
 * Hook layer mirrors the brief's resource-per-file pattern. Each query
 * key starts with `["campaigns", ...]` so we can invalidate broadly on
 * mutation.
 *
 * The list / detail / create hooks below talk to Supabase; metrics,
 * time-series and "top X" hooks still read from mock data because those
 * depend on aggregated share events that don't exist in the DB yet.
 */

type CampaignRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  cover_image_path: string | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  max_points_cap: number;
  points_per_share: number;
  points_per_1k_views: number;
  hashtags: string[] | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

const CAMPAIGN_COLUMNS =
  "id, organization_id, name, description, cover_image_path, status, start_date, end_date, max_points_cap, points_per_share, points_per_1k_views, hashtags, created_at, updated_at, archived_at";

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    coverImageUrl: row.cover_image_path,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    maxPointsCap: row.max_points_cap,
    pointsPerShare: row.points_per_share,
    pointsPer1kViews: row.points_per_1k_views,
    hashtags: row.hashtags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export type CampaignFilters = {
  search?: string;
  status?: CampaignStatus | "all";
  sort?: "recent" | "most_points" | "ending_soon";
};

export function useCampaigns(filters: CampaignFilters = {}) {
  const org = useOrganization();
  return useQuery({
    queryKey: ["campaigns", "list", org.id, filters],
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      let q = supabase
        .from("campaigns")
        .select(
          CAMPAIGN_COLUMNS,
        )
        .eq("organization_id", org.id)
        .is("archived_at", null);

      const status = filters.status ?? "all";
      if (status !== "all") {
        q = q.eq("status", status);
      }
      const search = filters.search?.trim();
      if (search) {
        q = q.ilike("name", `%${search}%`);
      }
      const sort = filters.sort ?? "recent";
      switch (sort) {
        case "ending_soon":
          // Nulls last in PostgREST ascending sort.
          q = q.order("end_date", { ascending: true, nullsFirst: false });
          break;
        case "most_points":
          q = q.order("max_points_cap", { ascending: false });
          break;
        case "recent":
        default:
          q = q.order("created_at", { ascending: false });
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as CampaignRow[]).map(mapCampaign);
    },
  });
}

export function useCampaign(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaigns", "detail", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          CAMPAIGN_COLUMNS,
        )
        .eq("id", campaignId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`Campaign ${campaignId} not found`);
      return mapCampaign(data as CampaignRow);
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
  pointsPerShare: number;
  pointsPer1kViews: number;
  hashtags?: readonly string[];
};

export function useCreateCampaign() {
  const qc = useQueryClient();
  const org = useOrganization();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const supabase = getSupabaseBrowserClient();
      // Insert as 'active' so the campaign is immediately visible on mobile
      // (mobile RLS filters status = 'active' AND archived_at IS NULL — see
      // migration 0012). When a draft/publish workflow lands later, move
      // this back to 'draft' and add a separate publish action.
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          organization_id: org.id,
          name: input.name,
          description: input.description ?? null,
          cover_image_path: input.coverImageUrl ?? null,
          start_date: input.startDate ?? null,
          end_date: input.endDate ?? null,
          max_points_cap: input.maxPointsCap,
          points_per_share: input.pointsPerShare,
          points_per_1k_views: input.pointsPer1kViews,
          hashtags: input.hashtags ? [...input.hashtags] : [],
          status: "active",
        })
        .select(CAMPAIGN_COLUMNS)
        .single();
      if (error || !data) throw error ?? new Error("Insert returned no row");
      return mapCampaign(data as CampaignRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Campaign> }): Promise<Campaign> => {
      const supabase = getSupabaseBrowserClient();
      // Map camelCase domain fields → snake_case DB columns. Only fields
      // present in the patch get updated; everything else is left alone.
      const patch: Record<string, unknown> = {};
      if (input.patch.name !== undefined) patch.name = input.patch.name;
      if (input.patch.description !== undefined) patch.description = input.patch.description;
      if (input.patch.startDate !== undefined) patch.start_date = input.patch.startDate;
      if (input.patch.endDate !== undefined) patch.end_date = input.patch.endDate;
      if (input.patch.maxPointsCap !== undefined) patch.max_points_cap = input.patch.maxPointsCap;
      if (input.patch.coverImageUrl !== undefined) patch.cover_image_path = input.patch.coverImageUrl;
      if (input.patch.pointsPerShare !== undefined) patch.points_per_share = input.patch.pointsPerShare;
      if (input.patch.pointsPer1kViews !== undefined) patch.points_per_1k_views = input.patch.pointsPer1kViews;
      if (input.patch.hashtags !== undefined) patch.hashtags = [...input.patch.hashtags];
      const { data, error } = await supabase
        .from("campaigns")
        .update(patch)
        .eq("id", input.id)
        .select(
          CAMPAIGN_COLUMNS,
        )
        .single();
      if (error || !data) throw error ?? new Error("Update returned no row");
      return mapCampaign(data as CampaignRow);
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
