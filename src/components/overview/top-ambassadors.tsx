"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { useOverviewTopAmbassadors } from "@/hooks/use-ambassador-overview";
import { formatCount, formatPoints } from "@/lib/format";
import type { OverviewRange } from "@/lib/mock/data";

/**
 * Top ambassadors leaderboard with a metric toggle. Brief calls for a
 * tabbed view between "by views" and "by points"; both tap the same hook
 * with a different `metric` arg so React Query caches them separately.
 */
type Metric = "views" | "points";

export function TopAmbassadorsLeaderboard({ range }: { range: OverviewRange }) {
  const [metric, setMetric] = useState<Metric>("views");
  const { data } = useOverviewTopAmbassadors(range, metric, 5);

  const formatter = metric === "views" ? formatCount : formatPoints;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background/40 p-0.5">
        {(["views", "points"] as Metric[]).map((m) => {
          const active = m === metric;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMetric(m)}
              className={
                "flex-1 rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors " +
                (active
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              By {m}
            </button>
          );
        })}
      </div>

      {!data || data.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
          No activity in this range
        </div>
      ) : (
        <ol className="space-y-1.5">
          {data.map(({ ambassador, value }, i) => {
            const fullName = `${ambassador.firstName ?? ""} ${ambassador.lastName ?? ""}`.trim();
            return (
              <li key={ambassador.id}>
                <Link
                  href={`/dashboard/ambassadors/list/${ambassador.id}`}
                  className="flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted"
                >
                  <span className="w-4 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <Avatar
                    src={ambassador.profilePictureUrl}
                    name={fullName || ambassador.instagramHandle || "?"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">{fullName}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      @{ambassador.instagramHandle}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
                    {formatter(value)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
