"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useCampaignContents } from "@/hooks/use-campaign-contents";
import { contentShares, shareMetrics } from "@/lib/mock/data";
import { formatCount, formatPoints } from "@/lib/format";

/**
 * Image-led grid of every content piece in a campaign. Inline mini-stats
 * (views, shares, points) — clicking opens that content's detail page.
 *
 * The mini-stats are computed client-side from the mock data layer to
 * avoid a hook explosion (one query per tile would be wasteful). When
 * this is wired to real Supabase, replace with a single batched RPC.
 */
export function ContentGrid({ campaignId }: { campaignId: string }) {
  const { data: contents, isLoading } = useCampaignContents(campaignId);

  if (isLoading) return null;
  if (!contents || contents.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 text-sm text-muted-foreground">
        No content yet — add the first piece with “+ Add content”.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {contents.map((c, i) => {
        const shares = contentShares.filter((s) => s.campaignContentId === c.id);
        const views = shares.reduce((acc, s) => {
          const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
          return acc + (m?.views ?? 0);
        }, 0);
        const points = shares.reduce((acc, s) => {
          const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
          const milestones = Math.floor((m?.views ?? 0) / 1000);
          return acc + s.pointsAwardedForShare + milestones * s.pointsPer1kViewsSnapshot;
        }, 0);

        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(i, 8) * 0.03 }}
          >
            <Link
              href={`/dashboard/ambassadors/campaigns/${campaignId}/content/${c.id}`}
              className="group block overflow-hidden rounded-2xl border border-border/60 bg-card p-2 surface-floating transition-shadow hover:surface-floating-hover"
            >
              <div className="relative overflow-hidden rounded-xl">
                <div className="relative aspect-[4/5] bg-muted">
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt=""
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : null}
                  {c.type === "video" ? (
                    <div className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                      <Play className="size-3.5 fill-white text-white" />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="px-1.5 pb-1 pt-2.5">
                <div className="flex items-baseline gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground tabular-nums">
                    {formatCount(views)}
                  </span>
                  <span>views</span>
                  <span className="text-border">·</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {shares.length}
                  </span>
                  <span>shares</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{c.pointsPerShare} pts/share</span>
                  <span className="tabular-nums">{formatPoints(points)} earned</span>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
