"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Instagram, Loader2, RotateCcw, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpdateAmbassadorStatus } from "@/hooks/use-ambassadors";
import { contentShares, shareMetrics } from "@/lib/mock/data";
import { formatCount, formatPoints } from "@/lib/format";
import type { Ambassador } from "@/lib/types";

/**
 * Card for the Our Ambassadors grid. The action buttons that appear in
 * the footer depend on the ambassador's current status:
 *   - approved → no actions (use the detail page for Suspend/Remove)
 *   - pending  → Approve / Reject
 *   - rejected → Reinstate (returns to approved)
 *   - suspended → Reinstate
 *
 * `onReject` is wired from the parent so we can route the click into
 * the shared reject-reason dialog rather than each card hosting its own.
 */
export function AmbassadorCard({
  ambassador,
  index,
  onReject,
}: {
  ambassador: Ambassador;
  index: number;
  onReject: (ambassador: Ambassador) => void;
}) {
  const update = useUpdateAmbassadorStatus();

  const fullName = `${ambassador.firstName ?? ""} ${ambassador.lastName ?? ""}`.trim();
  const myShares = contentShares.filter((s) => s.ambassadorId === ambassador.id);

  // Stats include cross-festival history when present, so a fresh applicant
  // with prior ambassador track record doesn't read as 0/0/0.
  const totalShares = myShares.length + (ambassador.priorShares ?? 0);
  const totalViews =
    myShares.reduce((acc, s) => {
      const m = shareMetrics.find((sm) => sm.contentShareId === s.id);
      return acc + (m?.views ?? 0);
    }, 0) + (ambassador.priorViews ?? 0);
  const totalPoints =
    ambassador.lifetimePointsEarned + (ambassador.priorPointsEarned ?? 0);
  const priorOrgs = ambassador.priorOrganizationCount ?? 0;

  const joined = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
    new Date(ambassador.appliedAt),
  );

  async function setStatus(status: "approved" | "suspended") {
    try {
      await update.mutateAsync({ id: ambassador.id, status });
    } catch {
      // Toast handling lands when we wire the toast system.
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(index, 8) * 0.03 }}
      className="h-full"
    >
      <Card
        interactive
        className="relative flex h-full flex-col overflow-hidden rounded-2xl"
      >
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
          {priorOrgs > 0 ? (
            <div
              className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand"
              title={`Previously an ambassador at ${priorOrgs} other ${priorOrgs === 1 ? "festival" : "festivals"}`}
            >
              <span>★</span>
              <span className="tabular-nums">{priorOrgs}×</span>
            </div>
          ) : null}
          {ambassador.status === "rejected" ? (
            <span className="inline-flex items-center rounded-full bg-status-danger/15 px-2 py-0.5 text-[10px] font-medium text-status-danger">
              Rejected
            </span>
          ) : null}
        </div>

        <Link
          href={`/dashboard/ambassadors/list/${ambassador.id}`}
          className="flex flex-1 flex-col px-5 pb-4 pt-5"
        >
          <div className="flex items-center gap-3 pr-12">
            <Avatar
              src={ambassador.profilePictureUrl}
              name={fullName || ambassador.instagramHandle || "?"}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold leading-snug text-foreground">
                {fullName || ambassador.instagramHandle}
              </div>
              <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                @{ambassador.instagramHandle}
              </div>
              <div className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                <Instagram className="size-3 shrink-0" aria-label="Instagram" />
                <span className="tabular-nums">
                  {formatCount(ambassador.instagramFollowerCount)} followers
                </span>
              </div>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 py-4">
            <Stat label="Views" value={formatCount(totalViews)} />
            <Stat label="Shares" value={String(totalShares)} />
            <Stat label="Points" value={formatPoints(totalPoints)} />
          </dl>

          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
            <span>{ambassador.country ?? "—"}</span>
            <span>Joined {joined}</span>
          </div>
        </Link>

        {/* Action footer — only rendered for actionable statuses. */}
        {ambassador.status === "pending" ? (
          <div className="flex gap-2 border-t border-border/50 bg-background/30 px-3 py-2.5">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => setStatus("approved")}
              disabled={update.isPending}
            >
              {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => onReject(ambassador)}
              disabled={update.isPending}
            >
              <X className="size-3.5" />
              Reject
            </Button>
          </div>
        ) : null}

        {ambassador.status === "rejected" || ambassador.status === "suspended" ? (
          <div className="border-t border-border/50 bg-background/30 px-3 py-2.5">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setStatus("approved")}
              disabled={update.isPending}
            >
              {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              Reinstate
            </Button>
          </div>
        ) : null}
      </Card>
    </motion.div>
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

