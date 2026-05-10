"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Check, Clock, Loader2, Pencil } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useReward } from "@/hooks/use-rewards";
import { useFulfillRedemption, useRedemptions } from "@/hooks/use-redemptions";
import { ambassadors as mockAmbassadors } from "@/lib/mock/data";
import { formatPoints } from "@/lib/format";
import { EditRewardDrawer } from "@/components/rewards/edit-reward-drawer";
import { usePermissions } from "@/providers/permissions-provider";

export default function RewardDetailPage({
  params,
}: {
  params: Promise<{ rewardId: string }>;
}) {
  const { rewardId } = use(params);
  const { data: reward, isLoading } = useReward(rewardId);
  const { data: redemptions } = useRedemptions({ rewardId });
  const fulfill = useFulfillRedemption();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("ambassador.reward.manage");
  const [editOpen, setEditOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onFulfill(id: string) {
    setPendingId(id);
    try {
      await fulfill.mutateAsync(id);
    } finally {
      setPendingId(null);
    }
  }

  if (isLoading || !reward) {
    return (
      <PermissionGuard permissions={["ambassador.reward.view"]}>
        <PageShell title="Reward">
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="size-[20px] animate-spin text-foreground" />
          </div>
        </PageShell>
      </PermissionGuard>
    );
  }

  const totalRedeemed = redemptions?.length ?? 0;
  const fulfilledRedemptions = redemptions?.filter((r) => r.status === "fulfilled") ?? [];
  const pendingRedemptions = redemptions?.filter((r) => r.status === "pending") ?? [];
  const totalPointsDistributed = fulfilledRedemptions.reduce(
    (acc, r) => acc + r.pointsSpent,
    0,
  );
  const stockPct = reward.totalStock > 0 ? reward.remainingStock / reward.totalStock : 0;
  const lowStock =
    reward.remainingStock > 0 &&
    reward.remainingStock <= Math.max(2, reward.totalStock * 0.1);

  return (
    <PermissionGuard permissions={["ambassador.reward.view"]}>
      <PageShell
        title={reward.name}
        breadcrumbs={[
          { label: "Ambassadors", href: "/dashboard/ambassadors/rewards" },
          { label: "Rewards", href: "/dashboard/ambassadors/rewards" },
          { label: reward.name },
        ]}
        actions={
          canManage ? (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : null
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="overflow-hidden p-5">
            <div className="flex gap-5">
              <div className="w-40 shrink-0 overflow-hidden rounded-xl sm:w-48">
                <div className="aspect-square bg-muted">
                  {reward.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reward.imageUrl}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-5 items-center rounded-full bg-brand/15 px-2 text-[11px] font-medium tabular-nums text-brand">
                    {formatPoints(reward.pointsCost)} pts
                  </span>
                  {!reward.isActive ? (
                    <span className="inline-flex h-5 items-center rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-xl font-semibold leading-tight tracking-tight text-foreground">
                  {reward.name}
                </h2>
                {reward.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {reward.description}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Stock
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums text-foreground">
                  {reward.remainingStock}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  / {reward.totalStock} left
                </span>
              </div>
              <div className="mt-3">
                <Progress
                  value={reward.remainingStock}
                  max={reward.totalStock || 1}
                  className="h-1"
                />
              </div>
              {lowStock ? (
                <p className="mt-3 text-[11px] font-medium text-status-warning">
                  Running low — only {reward.remainingStock} remaining
                </p>
              ) : reward.remainingStock === 0 ? (
                <p className="mt-3 text-[11px] font-medium text-status-danger">
                  Out of stock
                </p>
              ) : (
                <p className="mt-3 text-[11px] text-muted-foreground tabular-nums">
                  {Math.round(stockPct * 100)}% of stock remaining
                </p>
              )}
            </Card>

            <Card className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Activity
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Redeemed" value={String(totalRedeemed)} />
                <Stat label="Pending" value={String(pendingRedemptions.length)} />
                <Stat label="Points" value={formatPoints(totalPointsDistributed)} />
              </dl>
            </Card>
          </div>
        </div>

        <section className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Redeemed by{" "}
            <span className="text-muted-foreground">({totalRedeemed})</span>
          </h3>
          {totalRedeemed === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/30 text-sm text-muted-foreground">
              Nobody has redeemed this reward yet.
            </div>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border/40">
                {redemptions!.map((r) => {
                  const a = mockAmbassadors.find((x) => x.id === r.ambassadorId);
                  const fullName = a
                    ? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim()
                    : "Unknown";
                  const dateStr = new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(r.createdAt));
                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        {a ? (
                          <Link
                            href={`/dashboard/ambassadors/list/${a.id}`}
                            className="flex items-center gap-3"
                          >
                            <Avatar
                              src={a.profilePictureUrl}
                              name={fullName || a.instagramHandle || "?"}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">
                                {fullName}
                              </div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                @{a.instagramHandle}
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unknown</span>
                        )}
                      </div>

                      <div className="hidden text-right text-[11px] tabular-nums text-muted-foreground sm:block">
                        <div>{dateStr}</div>
                        <div className="font-mono">{r.code}</div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {r.status === "fulfilled" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-positive/15 px-2 py-0.5 text-[11px] font-medium text-status-positive">
                            <Check className="size-3" />
                            Fulfilled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-warning/15 px-2 py-0.5 text-[11px] font-medium text-status-warning">
                            <Clock className="size-3" />
                            Pending
                          </span>
                        )}
                        {canManage && r.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onFulfill(r.id)}
                            disabled={pendingId === r.id}
                          >
                            {pendingId === r.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                            Fulfill
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </section>

        <EditRewardDrawer
          reward={reward}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      </PageShell>
    </PermissionGuard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="text-base font-semibold text-foreground tabular-nums leading-none">
        {value}
      </dd>
      <dt className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
    </div>
  );
}
