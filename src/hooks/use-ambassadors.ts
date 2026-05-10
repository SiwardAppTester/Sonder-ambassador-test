"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ambassadors as mockAmbassadors,
  ambassadorActivity,
  ambassadorSharedContent,
  ambassadorMetrics,
  pendingApplicationCount,
} from "@/lib/mock/data";
import { mockDelay } from "@/hooks/mock-delay";
import { useOrganization } from "@/providers/organization-provider";
import type { Ambassador, AmbassadorStatus } from "@/lib/types";

type StatusFilter = AmbassadorStatus | "all";

export function useAmbassadors(status: StatusFilter = "all", search?: string) {
  return useQuery({
    queryKey: ["ambassadors", "list", status, search ?? ""],
    queryFn: async () => {
      const s = (search ?? "").trim().toLowerCase();
      const filtered = mockAmbassadors.filter((a) => {
        if (status !== "all" && a.status !== status) return false;
        if (!s) return true;
        const fullName = `${a.firstName ?? ""} ${a.lastName ?? ""}`.toLowerCase();
        return fullName.includes(s) || (a.instagramHandle ?? "").toLowerCase().includes(s);
      });
      return mockDelay(filtered);
    },
  });
}

export function useAmbassador(id: string | null) {
  return useQuery({
    queryKey: ["ambassadors", "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const a = mockAmbassadors.find((x) => x.id === id);
      if (!a) throw new Error("not found");
      return mockDelay(a);
    },
  });
}

export function useAmbassadorActivity(id: string | null, daysBack = 90) {
  return useQuery({
    queryKey: ["ambassadors", "activity", id, daysBack],
    enabled: !!id,
    queryFn: () => mockDelay(ambassadorActivity(id!, daysBack)),
  });
}

export function useAmbassadorSharedContent(id: string | null) {
  return useQuery({
    queryKey: ["ambassadors", "shared-content", id],
    enabled: !!id,
    queryFn: () => mockDelay(ambassadorSharedContent(id!)),
  });
}

export function useAmbassadorMetrics(id: string | null) {
  const org = useOrganization();
  return useQuery({
    queryKey: ["ambassadors", "metrics", id, org.id],
    enabled: !!id,
    queryFn: () =>
      mockDelay(ambassadorMetrics(id!, org.instagramPaidBaselineCpv, org.platformShareCost)),
  });
}

/** Used by the secondary-sidebar badge for the Pending count. */
export function usePendingApplicationCount() {
  return useQuery({
    queryKey: ["ambassadors", "pending-count"],
    queryFn: () => mockDelay(pendingApplicationCount()),
  });
}

export function useUpdateAmbassadorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: AmbassadorStatus;
      rejectionReason?: string;
    }) => {
      const idx = mockAmbassadors.findIndex((a) => a.id === input.id);
      if (idx === -1) throw new Error("not found");
      const patch: Partial<Ambassador> = {
        status: input.status,
        decidedAt: new Date().toISOString(),
      };
      if (input.status === "rejected") {
        patch.rejectionReason = input.rejectionReason ?? null;
      }
      mockAmbassadors[idx] = { ...mockAmbassadors[idx], ...patch };
      return mockDelay(mockAmbassadors[idx], 150);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambassadors"] }),
  });
}
