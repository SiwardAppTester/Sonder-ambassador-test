"use client";

import { use, useState } from "react";
import { Loader2, Pause, Pencil, Play, Plus, Square } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { usePermissions } from "@/providers/permissions-provider";
import { useOrganization } from "@/providers/organization-provider";
import {
  useCampaign,
  useCampaignMetrics,
  useCampaignTimeSeries,
  useTopContentByViews,
  useUpdateCampaignStatus,
} from "@/hooks/use-campaigns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusPill } from "@/components/ui/status-pill";
import { Progress } from "@/components/ui/progress";
import { PerformanceLineChart } from "@/components/charts/performance-line-chart";
import { BestContentChart } from "@/components/charts/best-content-chart";
import { ContentGrid } from "@/components/campaigns/content-grid";
import { TopSharersStrip } from "@/components/campaigns/top-sharers-strip";
import { AddContentDrawer } from "@/components/campaigns/add-content-drawer";
import { EditCampaignDrawer } from "@/components/campaigns/edit-campaign-drawer";
import { useRealtimeCampaignMetrics } from "@/hooks/use-realtime";
import { formatCount, formatDateRange, formatMoney, formatPoints } from "@/lib/format";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);
  const org = useOrganization();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("ambassador.campaign.manage");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  useRealtimeCampaignMetrics(campaignId);

  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);
  const { data: metrics } = useCampaignMetrics(campaignId);
  const { data: series } = useCampaignTimeSeries(campaignId);
  const { data: topContent } = useTopContentByViews(campaignId, 5);
  const updateStatus = useUpdateCampaignStatus();

  // Pick the next status from the current one. Draft auto-routes to
  // "scheduled" when the start date is in the future so admins don't have
  // to manually pick.
  function publishNextStatus() {
    if (!campaign) return null;
    const now = Date.now();
    const startsLater =
      campaign.startDate && new Date(campaign.startDate).getTime() > now;
    switch (campaign.status) {
      case "draft":
        return startsLater ? "scheduled" : "active";
      case "scheduled":
        return "active";
      case "active":
        return "paused";
      case "paused":
        return "active";
      default:
        return null;
    }
  }

  const next = publishNextStatus();
  const primaryAction =
    next && {
      draft: { label: "Publish", icon: Play, target: next as "active" | "scheduled" },
      scheduled: { label: "Activate now", icon: Play, target: "active" as const },
      active: { label: "Pause", icon: Pause, target: "paused" as const },
      paused: { label: "Resume", icon: Play, target: "active" as const },
    }[campaign?.status as "draft" | "scheduled" | "active" | "paused"];

  const canEnd =
    campaign?.status === "active" || campaign?.status === "paused" || campaign?.status === "scheduled";

  return (
    <PermissionGuard permissions={["ambassador.campaign.view"]}>
      {campaignLoading || !campaign ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-[20px] animate-spin text-foreground" />
        </div>
      ) : (
        <PageShell
          title={campaign.name}
          description={campaign.description ?? undefined}
          breadcrumbs={[
            { label: "Ambassadors", href: "/dashboard/ambassadors/campaigns" },
            { label: "Campaigns", href: "/dashboard/ambassadors/campaigns" },
            { label: campaign.name },
          ]}
          actions={
            canManage ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                {canEnd ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id: campaign.id, status: "ended" })}
                    disabled={updateStatus.isPending}
                  >
                    <Square className="size-3.5" />
                    End campaign
                  </Button>
                ) : null}
                {primaryAction ? (
                  <Button
                    size="sm"
                    variant={campaign.status === "active" ? "outline" : "primary"}
                    onClick={() =>
                      updateStatus.mutate({
                        id: campaign.id,
                        status: primaryAction.target,
                      })
                    }
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <primaryAction.icon className="size-3.5" />
                    )}
                    {primaryAction.label}
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => setDrawerOpen(true)}>
                  <Plus className="size-4" />
                  Add content
                </Button>
              </>
            ) : null
          }
        >
          <section className="mb-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <StatusPill status={campaign.status} />
            <span>{formatDateRange(campaign.startDate, campaign.endDate)}</span>
            <span className="opacity-60">·</span>
            <span>Cap {formatPoints(campaign.maxPointsCap)}</span>
          </section>

          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              label="Total shares"
              value={formatCount(metrics?.totalShares ?? 0)}
            />
            <MetricCard label="Total reach" value={formatCount(metrics?.totalReach ?? 0)} />
            <PointsAwardedCard
              awarded={metrics?.pointsAwarded ?? 0}
              cap={campaign.maxPointsCap}
            />
            <MetricCard
              label="Money saved"
              value={formatMoney(metrics?.moneySaved ?? 0, org.currency)}
            />
            <MetricCard
              label="Active ambassadors"
              value={formatCount(metrics?.activeAmbassadors ?? 0)}
            />
            <MetricCard
              label="Avg views / share"
              value={formatCount(metrics?.avgViewsPerShare ?? 0)}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Performance over time</h3>
                <ChartLegend
                  items={[
                    { label: "Views", variant: "primary" },
                    { label: "Shares", variant: "secondary" },
                  ]}
                />
              </div>
              <PerformanceLineChart data={series ?? []} />
            </Card>
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Best performing content</h3>
                <span className="text-[11px] text-muted-foreground">Top 5 by views</span>
              </div>
              <BestContentChart data={topContent ?? []} campaignId={campaignId} />
            </Card>
          </section>

          <section className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-foreground">Content</h3>
            <ContentGrid campaignId={campaignId} />
          </section>

          <section>
            <TopSharersStrip campaignId={campaignId} />
          </section>

          <AddContentDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            campaignId={campaignId}
          />
          <EditCampaignDrawer
            open={editOpen}
            onClose={() => setEditOpen(false)}
            campaign={campaign}
          />
        </PageShell>
      )}
    </PermissionGuard>
  );
}

function PointsAwardedCard({ awarded, cap }: { awarded: number; cap: number }) {
  const pct = cap === 0 ? 0 : Math.min(1, awarded / cap);
  return (
    <div className="rounded-xl border border-border/60 bg-card surface-floating px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Points awarded
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {Math.round(pct * 100)}%
        </div>
      </div>
      <div className="mt-3 text-[26px] font-semibold tracking-tight leading-none text-foreground tabular-nums">
        {formatPoints(awarded)}
      </div>
      <Progress className="mt-2.5" value={pct} />
    </div>
  );
}

function ChartLegend({
  items,
}: {
  items: { label: string; variant: "primary" | "secondary" }[];
}) {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{
              background:
                it.variant === "primary" ? "rgb(var(--brand-rgb))" : "rgb(168 168 168)",
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
