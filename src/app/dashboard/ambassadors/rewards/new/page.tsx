"use client";

import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { RewardForm } from "@/components/rewards/reward-form";

export default function NewRewardPage() {
  return (
    <PermissionGuard permissions={["ambassador.reward.manage"]}>
      <PageShell
        title="New reward"
        description="Add a reward ambassadors can redeem with points."
        breadcrumbs={[
          { label: "Ambassadors", href: "/dashboard/ambassadors/rewards" },
          { label: "Rewards", href: "/dashboard/ambassadors/rewards" },
          { label: "New" },
        ]}
      >
        <RewardForm mode="create" />
      </PageShell>
    </PermissionGuard>
  );
}
