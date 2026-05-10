"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  campaignContents as mockContents,
  contentViewsOverTime,
  aggregateContentMetrics,
} from "@/lib/mock/data";
import { mockDelay } from "@/hooks/mock-delay";
import { useOrganization } from "@/providers/organization-provider";
import type { CampaignContent } from "@/lib/types";

export function useCampaignContents(campaignId: string | null) {
  return useQuery({
    queryKey: ["campaign-contents", "list", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const list = mockContents.filter((c) => c.campaignId === campaignId);
      list.sort(
        (a, b) =>
          (a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
            (b.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return mockDelay(list);
    },
  });
}

export function useCampaignContent(contentId: string | null) {
  return useQuery({
    queryKey: ["campaign-contents", "detail", contentId],
    enabled: !!contentId,
    queryFn: async () => {
      const found = mockContents.find((c) => c.id === contentId);
      if (!found) throw new Error("not found");
      return mockDelay(found);
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

export type UploadCampaignContentInput = Omit<CampaignContent, "id" | "createdAt"> & {
  // The real impl takes a File and runs it through createSignedUpload first.
  // Here we accept the resolved fileUrl directly.
};

export function useUploadCampaignContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadCampaignContentInput) => {
      const created: CampaignContent = {
        ...input,
        id: `cc-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      mockContents.push(created);
      return mockDelay(created, 250);
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
