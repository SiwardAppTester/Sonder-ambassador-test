"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useOrganization } from "@/providers/organization-provider";
import {
  useOverviewHeroMetrics,
  useOverviewPointsFlow,
  useOverviewReachSeries,
  useSharerDemographics,
} from "@/hooks/use-ambassador-overview";
import { useTopContentByViews } from "@/hooks/use-campaigns";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { ReachLineChart } from "@/components/charts/reach-line-chart";
import { PointsFlowChart } from "@/components/charts/points-flow-chart";
import { BestContentChart } from "@/components/charts/best-content-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { RangePicker } from "@/components/overview/range-picker";
import { CampaignFilter } from "@/components/overview/campaign-filter";
import { TopAmbassadorsLeaderboard } from "@/components/overview/top-ambassadors";
import { formatCount, formatMoney, formatPoints } from "@/lib/format";
import type { OverviewRange } from "@/lib/mock/data";

export default function OverviewPage() {
  const t = useTranslations("Ambassadors.Overview");
  const org = useOrganization();
  const [range, setRange] = useState<OverviewRange>("30d");
  const [campaignId, setCampaignId] = useState<string | "all">("all");

  const scopedCampaign = campaignId === "all" ? undefined : campaignId;

  const { data: hero } = useOverviewHeroMetrics(range, scopedCampaign);
  const { data: reachSeries } = useOverviewReachSeries(range, scopedCampaign);
  const { data: pointsFlow } = useOverviewPointsFlow(range, scopedCampaign);
  // Best content surfaces top 5 across the whole org when no campaign is
  // scoped — otherwise we'd just render one campaign's content. Pass null
  // to skip when a single campaign is filtered, but we only have a per-campaign
  // hook today. For "all", show top 5 from the most-active campaign.
  const { data: topContent } = useTopContentByViews(
    scopedCampaign ?? "c-001",
    5,
  );
  const { data: demographics } = useSharerDemographics();

  return (
    <PermissionGuard permissions={["ambassador.overview.view"]}>
      <PageShell
        title={t("title")}
        actions={
          <div className="flex items-center gap-2">
            <CampaignFilter value={campaignId} onChange={setCampaignId} />
            <RangePicker value={range} onChange={setRange} />
          </div>
        }
      >
        {/* Hero metrics row */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="Total reach"
            value={formatCount(hero?.totalReach.value ?? 0)}
            delta={hero?.totalReach.delta}
          />
          <MetricCard
            label="Total shares"
            value={formatCount(hero?.totalShares.value ?? 0)}
            delta={hero?.totalShares.delta}
          />
          <MetricCard
            label="Points distributed"
            value={formatPoints(hero?.pointsDistributed.value ?? 0)}
            delta={hero?.pointsDistributed.delta}
          />
          <MetricCard
            label="Money saved"
            value={formatMoney(hero?.moneySaved.value ?? 0, org.currency)}
            delta={hero?.moneySaved.delta}
          />
          <MetricCard
            label="Shares spent"
            value={formatMoney(hero?.moneySpentOnShares.value ?? 0, org.currency)}
            delta={hero?.moneySpentOnShares.delta}
          />
          <MetricCard
            label="Active ambassadors"
            value={formatCount(hero?.activeAmbassadors.value ?? 0)}
            delta={hero?.activeAmbassadors.delta}
          />
        </section>

        {/* 2x2 grid */}
        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Reach over time</h3>
            </div>
            <ReachLineChart data={reachSeries ?? []} />
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Best performing content
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {scopedCampaign ? "In this campaign" : "Top campaign · 5 by views"}
              </span>
            </div>
            <BestContentChart
              data={topContent ?? []}
              campaignId={scopedCampaign ?? "c-001"}
            />
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium text-foreground">Top ambassadors</h3>
            <TopAmbassadorsLeaderboard range={range} />
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium text-foreground">Age band</h3>
              {demographics ? (
                <DonutChart
                  data={demographics.ageBand}
                  ariaLabel="Age band distribution"
                />
              ) : null}
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium text-foreground">Country</h3>
              {demographics ? (
                <DonutChart
                  data={demographics.country}
                  ariaLabel="Country distribution"
                />
              ) : null}
            </Card>
          </div>
        </section>

        {/* Points flow row */}
        <section>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Points flow</h3>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <Legend label="Awarded" color="rgb(var(--brand-rgb))" />
                <Legend label="Redeemed" color="hsl(0 45% 62%)" />
              </div>
            </div>
            <PointsFlowChart data={pointsFlow ?? []} />
          </Card>
        </section>
      </PageShell>
    </PermissionGuard>
  );
}

function Legend({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
