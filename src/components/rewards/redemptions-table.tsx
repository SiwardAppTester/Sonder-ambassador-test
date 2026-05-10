"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRedemptions, useFulfillRedemption } from "@/hooks/use-redemptions";
import { useRealtimeRedemptions } from "@/hooks/use-realtime";
import { useOrganization } from "@/providers/organization-provider";
import { ambassadors as mockAmbassadors, rewards as mockRewards } from "@/lib/mock/data";
import { formatDateRange, formatPoints } from "@/lib/format";
import type { RedemptionStatus } from "@/lib/types";

/**
 * Redemptions queue. Pending rows have a Mark fulfilled action (the brief's
 * primary admin task here). Filter chips up top scope to all/pending/fulfilled.
 *
 * The ambassador and reward lookups go through the mock data layer for now;
 * grafted to Supabase, replace with a select that joins `redemptions` against
 * `ambassadors` + `rewards` so the UI gets the names without an N+1.
 */
export function RedemptionsTable() {
  const [status, setStatus] = useState<RedemptionStatus | "all">("all");
  const org = useOrganization();
  useRealtimeRedemptions(org.id);
  const { data, isLoading } = useRedemptions({ status });
  const fulfill = useFulfillRedemption();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onFulfill(id: string) {
    setPendingId(id);
    try {
      await fulfill.mutateAsync(id);
    } finally {
      setPendingId(null);
    }
  }

  const filters: { value: RedemptionStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "fulfilled", label: "Fulfilled" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card surface-floating p-1">
        {filters.map((f) => {
          const active = f.value === status;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                (active
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-[20px] animate-spin text-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 text-sm text-muted-foreground">
          No redemptions
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-background/30 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Ambassador</th>
                <th className="px-4 py-2.5">Reward</th>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Points</th>
                <th className="px-4 py-2.5">Requested</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.map((r) => {
                const a = mockAmbassadors.find((x) => x.id === r.ambassadorId);
                const reward = mockRewards.find((x) => x.id === r.rewardId);
                const fullName = a
                  ? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim()
                  : "Unknown";
                return (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      {a ? (
                        <Link
                          href={`/dashboard/ambassadors/list/${a.id}`}
                          className="flex items-center gap-2.5"
                        >
                          <Avatar
                            src={a.profilePictureUrl}
                            name={fullName || a.instagramHandle || "?"}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-foreground">{fullName}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              @{a.instagramHandle}
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {reward ? (
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                            {reward.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={reward.imageUrl}
                                alt=""
                                className="size-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                          <span className="truncate text-foreground">{reward.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {r.code}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {formatPoints(r.pointsSpent)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">
                      {formatDateRange(r.createdAt, r.fulfilledAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.status === "fulfilled"
                            ? "text-status-positive"
                            : "text-status-warning"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFulfill(r.id)}
                          disabled={pendingId === r.id}
                        >
                          {pendingId === r.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          Mark fulfilled
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
