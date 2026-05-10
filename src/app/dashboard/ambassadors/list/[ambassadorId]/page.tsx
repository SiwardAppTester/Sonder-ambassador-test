"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Loader2,
  Pause,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { useOrganization } from "@/providers/organization-provider";
import { usePermissions } from "@/providers/permissions-provider";
import {
  useAmbassador,
  useAmbassadorActivity,
  useAmbassadorMetrics,
  useAmbassadorSharedContent,
  useUpdateAmbassadorStatus,
} from "@/hooks/use-ambassadors";
import { useRedemptions } from "@/hooks/use-redemptions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { PerformanceLineChart } from "@/components/charts/performance-line-chart";
import { RejectApplicationDialog } from "@/components/ambassadors/reject-application-dialog";
import { rewards as mockRewards } from "@/lib/mock/data";
import {
  formatCount,
  formatDateRange,
  formatMoney,
  formatPoints,
} from "@/lib/format";
import type { AmbassadorStatus } from "@/lib/types";

export default function AmbassadorDetailPage({
  params,
}: {
  params: Promise<{ ambassadorId: string }>;
}) {
  const { ambassadorId } = use(params);
  const org = useOrganization();
  const { hasPermission } = usePermissions();
  const canReview = hasPermission("ambassador.applicant.review");

  const { data: ambassador, isLoading } = useAmbassador(ambassadorId);
  const { data: metrics } = useAmbassadorMetrics(ambassadorId);
  const { data: activity } = useAmbassadorActivity(ambassadorId, 90);
  const { data: shared } = useAmbassadorSharedContent(ambassadorId);
  const { data: redemptions } = useRedemptions({ ambassadorId });
  const update = useUpdateAmbassadorStatus();
  const [rejectOpen, setRejectOpen] = useState(false);

  const fullName = ambassador
    ? `${ambassador.firstName ?? ""} ${ambassador.lastName ?? ""}`.trim()
    : "";
  const memberSince = ambassador
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(ambassador.appliedAt),
      )
    : "";

  async function setStatus(status: AmbassadorStatus) {
    if (!ambassador) return;
    try {
      await update.mutateAsync({ id: ambassador.id, status });
    } catch {
      // toast hookup later
    }
  }

  return (
    <PermissionGuard permissions={["ambassador.list.view"]}>
      {isLoading || !ambassador ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-[20px] animate-spin text-foreground" />
        </div>
      ) : (
        <PageShell
          title={fullName || ambassador.instagramHandle || "Ambassador"}
          breadcrumbs={[
            { label: "Ambassadors", href: "/dashboard/ambassadors/list" },
            { label: "Our Ambassadors", href: "/dashboard/ambassadors/list" },
            { label: fullName || ambassador.instagramHandle || "Ambassador" },
          ]}
        >
          {/* Header card */}
          <Card className="mb-6 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={ambassador.profilePictureUrl}
                  name={fullName || ambassador.instagramHandle || "?"}
                  size="lg"
                  className="size-16"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">{fullName}</h2>
                    <StatusPill status={ambassador.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                    {ambassador.instagramHandle ? (
                      <a
                        href={`https://instagram.com/${ambassador.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-foreground/85 hover:text-foreground"
                      >
                        @{ambassador.instagramHandle}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                    <span className="tabular-nums">
                      {formatCount(ambassador.instagramFollowerCount)} followers
                    </span>
                    {ambassador.country ? <span>· {ambassador.country}</span> : null}
                    {ambassador.age ? <span>· {ambassador.age}y</span> : null}
                    <span>· Member since {memberSince}</span>
                  </div>
                  {ambassador.status === "rejected" && ambassador.rejectionReason ? (
                    <p className="mt-2 max-w-prose text-xs text-status-danger">
                      Rejected: {ambassador.rejectionReason}
                    </p>
                  ) : null}
                </div>
              </div>

              {canReview ? (
                <div className="flex flex-wrap items-center gap-2">
                  {ambassador.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setStatus("approved")}
                        disabled={update.isPending}
                      >
                        <Check className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectOpen(true)}
                        disabled={update.isPending}
                      >
                        <X className="size-3.5" />
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {ambassador.status === "approved" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus("suspended")}
                        disabled={update.isPending}
                      >
                        <Pause className="size-3.5" />
                        Suspend
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setStatus("removed")}
                        disabled={update.isPending}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </>
                  ) : null}
                  {ambassador.status === "rejected" || ambassador.status === "suspended" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus("approved")}
                      disabled={update.isPending}
                    >
                      <RotateCcw className="size-3.5" />
                      Reinstate
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          {/* Metrics row */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Lifetime points" value={formatPoints(ambassador.lifetimePointsEarned)} />
            <Stat label="Current balance" value={formatPoints(ambassador.pointsBalance)} />
            <Stat label="Total shares" value={formatCount(metrics?.totalShares ?? 0)} />
            <Stat label="Total reach" value={formatCount(metrics?.totalReach ?? 0)} />
            <Stat
              label="Money generated"
              value={formatMoney(metrics?.moneyGenerated ?? 0, org.currency)}
            />
          </section>

          {/* Activity chart */}
          <Card className="mb-6 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Activity (last 90 days)</h3>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <Legend label="Views" variant="primary" />
                <Legend label="Shares" variant="secondary" />
              </div>
            </div>
            {activity && activity.length > 0 ? (
              <PerformanceLineChart data={activity} />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No activity in the last 90 days
              </div>
            )}
          </Card>

          {/* Shared content gallery */}
          <section className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-foreground">Shared content</h3>
            {!shared || shared.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 text-sm text-muted-foreground">
                No shares yet
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {shared.map(({ share, content, campaign, views }) =>
                  content && campaign ? (
                    <Link
                      key={share.id}
                      href={`/dashboard/ambassadors/campaigns/${campaign.id}/content/${content.id}`}
                      className="group block overflow-hidden rounded-lg border border-border/60 bg-card surface-floating transition-shadow hover:surface-floating-hover"
                    >
                      <div className="relative aspect-[4/5] bg-muted">
                        {content.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={content.thumbnailUrl}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/65 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-[10px] tabular-nums text-white/95">
                          {formatCount(views)} views
                        </div>
                      </div>
                      <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        <div className="truncate">{campaign.name}</div>
                      </div>
                    </Link>
                  ) : null,
                )}
              </div>
            )}
          </section>

          {/* Redemption history */}
          <section>
            <h3 className="mb-3 text-sm font-medium text-foreground">Redemption history</h3>
            {!redemptions || redemptions.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 text-sm text-muted-foreground">
                No redemptions yet
              </div>
            ) : (
              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-background/30 text-left text-[11px] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Reward</th>
                      <th className="px-4 py-2.5 font-medium">Code</th>
                      <th className="px-4 py-2.5 font-medium">Points</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Dates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {redemptions.map((r) => {
                      const reward = mockRewards.find((rw) => rw.id === r.rewardId);
                      return (
                        <tr key={r.id} className="hover:bg-muted/40">
                          <td className="px-4 py-3 text-foreground">{reward?.name ?? "—"}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                            {r.code}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-foreground">
                            {formatPoints(r.pointsSpent)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                r.status === "fulfilled"
                                  ? "text-status-positive"
                                  : "text-status-warning"
                              }
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-muted-foreground">
                            {formatDateRange(r.createdAt, r.fulfilledAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}
          </section>

          <RejectApplicationDialog
            open={rejectOpen}
            onClose={() => setRejectOpen(false)}
            ambassadorId={ambassador.id}
            ambassadorName={fullName || ambassador.instagramHandle || ""}
          />
        </PageShell>
      )}
    </PermissionGuard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card surface-floating px-4 py-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 text-[26px] font-semibold tracking-tight leading-none text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Legend({
  label,
  variant,
}: {
  label: string;
  variant: "primary" | "secondary";
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-1.5 rounded-full"
        style={{
          background: variant === "primary" ? "rgb(var(--brand-rgb))" : "rgb(168 168 168)",
        }}
      />
      {label}
    </span>
  );
}
