"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/format";
import type { Reward } from "@/lib/types";

/**
 * Reward catalog card. Image-led, with name, points cost, and a thin
 * brand-color stock meter ("12 / 50 left"). Out-of-stock items are dimmed
 * with an overlaid badge — the rest of the card stays readable so admins
 * can still see how many were sold.
 */
export function RewardCard({
  reward,
  index,
  hrefBase = "/dashboard/ambassadors/rewards",
}: {
  reward: Reward;
  index: number;
  hrefBase?: string;
}) {
  const outOfStock = reward.remainingStock <= 0;
  const lowStock = !outOfStock && reward.remainingStock <= Math.max(2, reward.totalStock * 0.1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index, 8) * 0.03 }}
    >
      <Link href={`${hrefBase}/${reward.id}`} className="block">
        <Card
          interactive
          className={cn("relative overflow-hidden rounded-2xl p-3", outOfStock && "opacity-60")}
        >
          <div className="relative overflow-hidden rounded-xl">
            <div className="relative aspect-[4/3] bg-muted">
              {reward.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={reward.imageUrl}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : null}
              {outOfStock ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
                  <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-medium tracking-wide text-white">
                    Out of stock
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="px-2 pb-1 pt-4">
            <span className="inline-flex h-5 items-center rounded-full bg-brand/15 px-2 text-[11px] font-medium tabular-nums text-brand">
              {formatPoints(reward.pointsCost)} pts
            </span>

            <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
              {reward.name}
            </h3>

            <div className="mt-4 flex items-center gap-3">
              <Progress
                value={reward.remainingStock}
                max={reward.totalStock || 1}
                className="h-0.5 flex-1"
              />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {reward.remainingStock}/{reward.totalStock}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
              <span>{reward.remainingStock} left in stock</span>
              {lowStock ? (
                <span className="font-medium text-status-warning">Low</span>
              ) : (
                <span className="tabular-nums">
                  {Math.round((reward.remainingStock / (reward.totalStock || 1)) * 100)}%
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
