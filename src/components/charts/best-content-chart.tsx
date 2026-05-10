"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { formatCount } from "@/lib/format";
import { chartTheme } from "./chart-theme";
import type { CampaignContent } from "@/lib/types";

/**
 * Top-N content pieces by views — rendered as a custom horizontal bar
 * list rather than a full Recharts BarChart, because each bar gets a
 * thumbnail of the content piece (a flourish Recharts can't do natively).
 *
 * Click a row → that content's detail page.
 */
export function BestContentChart({
  data,
  campaignId,
}: {
  data: { content: CampaignContent; views: number; shares: number }[];
  campaignId: string;
}) {
  const params = useParams();
  const router = useRouter();
  // Suppress unused — useParams left in case the route pattern changes.
  void params;
  void router;

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No shares yet
      </div>
    );
  }

  const max = data[0].views || 1;

  return (
    <div className="space-y-2.5">
      {data.map(({ content, views, shares }) => {
        const pct = (views / max) * 100;
        return (
          <Link
            key={content.id}
            href={`/dashboard/ambassadors/campaigns/${campaignId}/content/${content.id}`}
            className="group flex items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted"
          >
            <div className="size-9 shrink-0 overflow-hidden rounded-md bg-muted">
              {content.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={content.thumbnailUrl}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-foreground">
                  {content.captionTemplate ?? `${content.type === "video" ? "Video" : "Image"} ${content.id.slice(-4)}`}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCount(views)} <span className="opacity-60">· {shares} shares</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${pct}%`,
                    background: chartTheme.primary,
                  }}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
