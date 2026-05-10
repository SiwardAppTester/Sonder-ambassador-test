"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { usePermissions } from "@/providers/permissions-provider";
import { useRewards } from "@/hooks/use-rewards";
import { Tabs, TabPanel, type TabItem } from "@/components/ui/tabs";
import { RewardCard } from "@/components/rewards/reward-card";
import { RedemptionsTable } from "@/components/rewards/redemptions-table";
import { NewRewardDrawer } from "@/components/rewards/new-reward-drawer";

type TabValue = "catalog" | "redemptions";

export default function RewardsPage() {
  const t = useTranslations("Ambassadors.Rewards");
  const [tab, setTab] = useState<TabValue>("catalog");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("ambassador.reward.manage");

  const { data: rewards, isLoading } = useRewards();

  const tabs: TabItem<TabValue>[] = [
    { value: "catalog", label: t("tabs.catalog") },
    { value: "redemptions", label: t("tabs.redemptions") },
  ];

  return (
    <PermissionGuard permissions={["ambassador.reward.view"]}>
      <PageShell
        title={t("title")}
        actions={
          canManage && tab === "catalog" ? (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" />
              {t("newReward")}
            </button>
          ) : null
        }
      >
        <Tabs value={tab} onChange={setTab} items={tabs} ariaLabel="Rewards section" />

        <TabPanel active={tab === "catalog"}>
          {isLoading ? (
            <div className="flex h-[40vh] items-center justify-center">
              <Loader2 className="size-[20px] animate-spin text-foreground" />
            </div>
          ) : !rewards || rewards.length === 0 ? (
            <div className="flex h-[36vh] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 px-6 text-center">
              <p className="text-sm font-medium text-foreground">No rewards yet</p>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground"
                >
                  <Plus className="size-4" />
                  Create the first reward
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rewards.map((r, i) => (
                <RewardCard key={r.id} reward={r} index={i} />
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel active={tab === "redemptions"}>
          <RedemptionsTable />
        </TabPanel>

        <NewRewardDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </PageShell>
    </PermissionGuard>
  );
}
