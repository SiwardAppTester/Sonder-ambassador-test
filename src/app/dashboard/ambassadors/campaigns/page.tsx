"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Search } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { usePermissions } from "@/providers/permissions-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useCampaigns, useCampaignsListMetrics } from "@/hooks/use-campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MetricCard } from "@/components/ui/metric-card";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { NewCampaignDrawer } from "@/components/campaigns/new-campaign-drawer";
import { formatCount, formatMoney, formatPoints } from "@/lib/format";
import type { CampaignFilters } from "@/hooks/use-campaigns";
import type { CampaignStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: CampaignStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "ended", label: "Ended" },
];

const SORT_OPTIONS: { value: NonNullable<CampaignFilters["sort"]>; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "most_points", label: "Largest cap" },
  { value: "ending_soon", label: "Ending soon" },
];

export default function CampaignsPage() {
  const t = useTranslations("Ambassadors.Campaigns");
  const { hasPermission } = usePermissions();
  const org = useOrganization();
  const canManage = hasPermission("ambassador.campaign.manage");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CampaignFilters["status"]>("all");
  const [sort, setSort] = useState<CampaignFilters["sort"]>("recent");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: metrics } = useCampaignsListMetrics();
  const { data: campaigns, isLoading } = useCampaigns({ search, status, sort });

  return (
    <PermissionGuard permissions={["ambassador.campaign.view"]}>
      <PageShell
        title={t("title")}
        actions={
          canManage ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              {t("newCampaign")}
            </Button>
          ) : null
        }
      >
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label={t("metrics.activeCampaigns")}
            value={formatCount(metrics?.activeCampaigns.value ?? 0)}
            delta={metrics?.activeCampaigns.deltaVsPrev}
          />
          <MetricCard
            label={t("metrics.pointsAwardedThisMonth")}
            value={formatPoints(metrics?.pointsAwardedThisMonth.value ?? 0)}
            delta={metrics?.pointsAwardedThisMonth.deltaVsPrev}
          />
          <MetricCard
            label={t("metrics.totalReachThisMonth")}
            value={formatCount(metrics?.totalReachThisMonth.value ?? 0)}
            delta={metrics?.totalReachThisMonth.deltaVsPrev}
          />
          <MetricCard
            label={t("metrics.moneySavedThisMonth")}
            value={formatMoney(metrics?.moneySavedThisMonth.value ?? 0, org.currency)}
            delta={metrics?.moneySavedThisMonth.deltaVsPrev}
          />
        </section>

        <section className="mb-5 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="pl-8"
            />
          </div>
          <Select
            value={status ?? "all"}
            onChange={(v) => setStatus(v as CampaignFilters["status"])}
            options={STATUS_OPTIONS}
            ariaLabel="Filter by status"
          />
          <Select
            value={sort ?? "recent"}
            onChange={(v) => setSort(v as CampaignFilters["sort"])}
            options={SORT_OPTIONS}
            ariaLabel="Sort campaigns"
          />
        </section>

        {isLoading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="size-[20px] animate-spin text-foreground" />
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <EmptyState
            title={t("empty.title")}
            cta={t("empty.cta")}
            onCtaClick={canManage ? () => setDialogOpen(true) : undefined}
          />
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} index={i} />
            ))}
          </section>
        )}

        <NewCampaignDrawer open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </PageShell>
    </PermissionGuard>
  );
}

function EmptyState({
  title,
  cta,
  onCtaClick,
}: {
  title: string;
  cta: string;
  onCtaClick?: () => void;
}) {
  return (
    <div className="flex h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 px-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {onCtaClick ? (
        <Button className="mt-4" onClick={onCtaClick}>
          <Plus className="size-4" />
          {cta}
        </Button>
      ) : null}
    </div>
  );
}
