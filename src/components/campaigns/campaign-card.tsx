"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useOrganization } from "@/providers/organization-provider";
import { useCampaignContents } from "@/hooks/use-campaign-contents";
import { useCampaignMetrics } from "@/hooks/use-campaigns";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Progress } from "@/components/ui/progress";
import { formatCount, formatDateRange, formatMoney, formatPoints } from "@/lib/format";
import type { Campaign } from "@/lib/types";

/**
 * One card on the campaigns grid. Shows:
 *   - horizontal thumbnail strip (3–4 small content images)
 *   - name + status pill
 *   - mini metrics: shares · views · points · cap progress bar
 *   - date range
 */
export function CampaignCard({ campaign, index }: { campaign: Campaign; index: number }) {
  const org = useOrganization();
  const { data: contents } = useCampaignContents(campaign.id);
  const { data: metrics } = useCampaignMetrics(campaign.id);

  const thumbnails = (contents ?? []).slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: Math.min(index, 8) * 0.04 }}
    >
      <Link href={`/dashboard/ambassadors/campaigns/${campaign.id}`} className="block">
        <Card interactive className="group overflow-hidden rounded-2xl p-3">
          <div className="overflow-hidden rounded-xl">
            <div className="grid grid-cols-4 gap-0.5">
              {Array.from({ length: 4 }).map((_, i) => {
                const c = thumbnails[i];
                return (
                  <div key={i} className="aspect-[3/4] bg-muted">
                    {c?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.thumbnailUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-2 pb-1 pt-4">
            <StatusPill status={campaign.status} />

            <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
              {campaign.name}
            </h3>

            <div className="mt-4 flex items-baseline gap-1.5 text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">
                {formatCount(metrics?.totalShares ?? 0)}
              </span>
              <span>shares</span>
              <span className="text-border">·</span>
              <span className="font-medium text-foreground tabular-nums">
                {formatCount(metrics?.totalReach ?? 0)}
              </span>
              <span>views</span>
              <span className="text-border">·</span>
              <span className="font-medium text-foreground tabular-nums">
                {formatPoints(metrics?.pointsAwarded ?? 0)}
              </span>
              <span>pts</span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <Progress value={metrics?.pointsCapPctUsed ?? 0} className="h-0.5 flex-1" />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {Math.round((metrics?.pointsCapPctUsed ?? 0) * 100)}% cap
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
              <span>{formatDateRange(campaign.startDate, campaign.endDate)}</span>
              <span className="tabular-nums">
                {formatMoney(metrics?.moneySaved ?? 0, org.currency)} saved
              </span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
