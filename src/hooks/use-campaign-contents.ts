"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  campaignContents as mockContents,
  contentViewsOverTime,
  aggregateContentMetrics,
} from "@/lib/mock/data";
import { mockDelay } from "@/hooks/mock-delay";
import { useOrganization } from "@/providers/organization-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CampaignContent, CampaignContentType } from "@/lib/types";

type ContentRow = {
  id: string;
  campaign_id: string;
  type: CampaignContentType;
  file_path: string;
  image_url: string | null;
  file_size_bytes: number;
  points_per_share: number;
  points_per_1k_views: number;
  caption_template: string | null;
  hashtags: string[] | null;
  instructions: string | null;
  display_order: number | null;
  created_at: string;
};

function mapContent(row: ContentRow): CampaignContent {
  // We prefer image_url (a long-lived signed URL set on insert) for both
  // file + thumbnail. file_path lives in the private bucket and isn't
  // directly fetchable by the browser.
  const url = row.image_url ?? row.file_path;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    type: row.type,
    fileUrl: url,
    thumbnailUrl: url,
    fileSizeBytes: row.file_size_bytes,
    pointsPerShare: row.points_per_share,
    pointsPer1kViews: row.points_per_1k_views,
    captionTemplate: row.caption_template,
    hashtags: row.hashtags ?? [],
    instructions: row.instructions,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

export function useCampaignContents(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign-contents", "list", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("campaign_contents")
        .select(
          "id, campaign_id, type, file_path, image_url, file_size_bytes, points_per_share, points_per_1k_views, caption_template, hashtags, instructions, display_order, created_at",
        )
        .eq("campaign_id", campaignId!)
        .is("archived_at", null)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as ContentRow[]).map(mapContent);
    },
  });
}

export function useCampaignContent(contentId: string | null) {
  return useQuery({
    queryKey: ["campaign-contents", "detail", contentId],
    enabled: !!contentId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("campaign_contents")
        .select(
          "id, campaign_id, type, file_path, image_url, file_size_bytes, points_per_share, points_per_1k_views, caption_template, hashtags, instructions, display_order, created_at",
        )
        .eq("id", contentId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("not found");
      return mapContent(data as ContentRow);
    },
  });
}

export function useContentViewsOverTime(contentId: string | null) {
  return useQuery({
    queryKey: ["campaign-contents", "views-series", contentId],
    enabled: !!contentId,
    queryFn: () => mockDelay(contentViewsOverTime(contentId!)),
  });
}

export function useContentMetrics(contentId: string | null) {
  const org = useOrganization();
  return useQuery({
    queryKey: ["campaign-contents", "metrics", contentId, org.id],
    enabled: !!contentId,
    queryFn: () =>
      mockDelay(
        aggregateContentMetrics(contentId!, org.instagramPaidBaselineCpv, org.platformShareCost),
      ),
  });
}

export type UploadCampaignContentInput = {
  campaignId: string;
  file: File;
  captionTemplate?: string | null;
  hashtags?: readonly string[];
  instructions?: string | null;
};

export function useUploadCampaignContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadCampaignContentInput): Promise<CampaignContent> => {
      const fd = new FormData();
      fd.append("file", input.file);
      fd.append("campaign_id", input.campaignId);
      if (input.captionTemplate) fd.append("caption_template", input.captionTemplate);
      if (input.instructions) fd.append("instructions", input.instructions);
      if (input.hashtags?.length) fd.append("hashtags", input.hashtags.join(","));

      const res = await fetch("/api/campaign-contents", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? "Upload failed");
      }
      return (await res.json()) as CampaignContent;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["campaign-contents", "list", vars.campaignId] });
    },
  });
}

export function useUpdateCampaignContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<CampaignContent> }) => {
      const idx = mockContents.findIndex((c) => c.id === input.id);
      if (idx === -1) throw new Error("not found");
      mockContents[idx] = { ...mockContents[idx], ...input.patch };
      return mockDelay(mockContents[idx], 100);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign-contents"] }),
  });
}

export function useDeleteCampaignContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const idx = mockContents.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error("not found");
      mockContents.splice(idx, 1);
      return mockDelay(true, 100);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaign-contents"] }),
  });
}
