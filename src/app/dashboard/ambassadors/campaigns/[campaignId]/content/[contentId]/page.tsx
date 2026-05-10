"use client";

import { use } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Play } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useOrganization } from "@/providers/organization-provider";
import {
  useCampaignContent,
  useContentMetrics,
  useContentViewsOverTime,
} from "@/hooks/use-campaign-contents";
import { useCampaign } from "@/hooks/use-campaigns";
import { useContentShares } from "@/hooks/use-content-shares";
import { useRealtimeContentMetrics } from "@/hooks/use-realtime";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Avatar } from "@/components/ui/avatar";
import { ViewsAreaChart } from "@/components/charts/views-area-chart";
import {
  formatCount,
  formatMoney,
  formatPercent,
  formatPoints,
} from "@/lib/format";

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string; contentId: string }>;
}) {
  const { campaignId, contentId } = use(params);
  const org = useOrganization();
  useRealtimeContentMetrics(contentId);
  const { data: content, isLoading } = useCampaignContent(contentId);
  const { data: campaign } = useCampaign(campaignId);
  const { data: metrics } = useContentMetrics(contentId);
  const { data: series } = useContentViewsOverTime(contentId);
  const { data: sharers } = useContentShares(contentId);

  const title =
    content?.captionTemplate ??
    `${content?.type === "video" ? "Video" : "Image"} ${content?.id.slice(-4) ?? ""}`;

  return (
    <PermissionGuard permissions={["ambassador.campaign.view"]}>
      {isLoading || !content ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-[20px] animate-spin text-foreground" />
        </div>
      ) : (
        <PageShell
          title={title}
          breadcrumbs={[
            { label: "Ambassadors", href: "/dashboard/ambassadors/campaigns" },
            { label: "Campaigns", href: "/dashboard/ambassadors/campaigns" },
            {
              label: campaign?.name ?? "Campaign",
              href: `/dashboard/ambassadors/campaigns/${campaignId}`,
            },
            { label: title },
          ]}
        >
          {/* Metrics row — same pattern as campaign + ambassador detail. */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              label="Total shares"
              value={formatCount(metrics?.totalShares ?? 0)}
            />
            <MetricCard
              label="Unique sharers"
              value={formatCount(metrics?.uniqueSharers ?? 0)}
            />
            <MetricCard label="Reach" value={formatCount(metrics?.reach ?? 0)} />
            <MetricCard
              label="Engagement"
              value={formatPercent(metrics?.engagementRate ?? 0, 1).replace("+", "")}
            />
            <MetricCard
              label="Money saved"
              value={formatMoney(metrics?.moneySaved ?? 0, org.currency)}
            />
            <MetricCard
              label="Points awarded"
              value={formatPoints(metrics?.pointsAwarded ?? 0)}
            />
          </section>

          {/* Preview + chart + content rules. Preview is constrained so it
              doesn't dominate the viewport on wide screens. */}
          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/5] max-h-[420px] bg-muted">
                {content.fileUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={content.fileUrl}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                {content.type === "video" ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-black/55 backdrop-blur-md">
                      <Play className="size-5 fill-white text-white" />
                    </div>
                  </div>
                ) : null}
              </div>
              {/* Content rules — clean key/value list under the preview. */}
              <dl className="space-y-2 border-t border-border/60 px-4 py-3.5 text-xs">
                <Row label="Per share" value={`${content.pointsPerShare} pts`} />
                <Row label="Per 1k views" value={`${content.pointsPer1kViews} pts`} />
                {content.hashtags.length > 0 ? (
                  <Row
                    label="Hashtags"
                    value={content.hashtags.map((h) => `#${h}`).join(" ")}
                    multiline
                  />
                ) : null}
              </dl>
              {content.instructions ? (
                <p className="border-t border-border/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                  {content.instructions}
                </p>
              ) : null}
            </Card>

            <Card className="flex flex-col p-4">
              <h3 className="mb-3 text-sm font-medium text-foreground">Views over time</h3>
              <div className="flex-1">
                <ViewsAreaChart data={series ?? []} />
              </div>
            </Card>
          </section>

          {/* Shared by — full-width table feels right for a list of N rows. */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium text-foreground">
              Shared by{" "}
              <span className="text-muted-foreground tabular-nums">
                {sharers?.length ?? 0}
              </span>
            </h3>
            {!sharers || sharers.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                No shares yet
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {sharers.map(({ share, ambassador, metrics: sm }) => {
                  if (!ambassador) return null;
                  const fullName = `${ambassador.firstName ?? ""} ${ambassador.lastName ?? ""}`.trim();
                  return (
                    <li
                      key={share.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <Link
                        href={`/dashboard/ambassadors/list/${ambassador.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <Avatar
                          src={ambassador.profilePictureUrl}
                          name={fullName || ambassador.instagramHandle || "?"}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm text-foreground">{fullName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            @{ambassador.instagramHandle}
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground tabular-nums">
                        <span>{formatCount(sm?.views ?? 0)} views</span>
                        <span>{formatPoints(share.pointsAwardedForShare)} pts</span>
                        <a
                          href={share.instagramPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-foreground"
                          aria-label="Open Instagram post"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </PageShell>
      )}
    </PermissionGuard>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${multiline ? "items-start" : "items-baseline"}`}>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={`text-right text-foreground ${
          multiline ? "min-w-0 break-words" : "truncate tabular-nums"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
