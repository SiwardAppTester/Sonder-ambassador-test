"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useTopSharersForCampaign } from "@/hooks/use-campaigns";
import { formatPoints } from "@/lib/format";

/**
 * Horizontal strip at the bottom of the campaign detail page: top 10
 * ambassadors by share count, with their avatar, share count, and points.
 *
 * Each card is a link to the ambassador's detail page.
 */
export function TopSharersStrip({ campaignId }: { campaignId: string }) {
  const { data, isLoading } = useTopSharersForCampaign(campaignId, 10);
  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <Card className="overflow-x-auto">
      <div className="border-b border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground">
        Top sharers
      </div>
      <ol className="flex min-w-max gap-3 px-4 py-4">
        {data.map(({ ambassador, shareCount, pointsEarned }) => {
          const fullName = `${ambassador.firstName ?? ""} ${ambassador.lastName ?? ""}`.trim();
          return (
            <li key={ambassador.id}>
              <Link
                href={`/dashboard/ambassadors/list/${ambassador.id}`}
                className="flex w-[140px] items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-muted"
              >
                <Avatar
                  src={ambassador.profilePictureUrl}
                  name={fullName || ambassador.instagramHandle || "?"}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-foreground">{fullName}</div>
                  <div className="truncate text-[11px] text-muted-foreground tabular-nums">
                    {shareCount} shares · {formatPoints(pointsEarned)} pts
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
