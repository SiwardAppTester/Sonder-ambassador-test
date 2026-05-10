import { cn } from "@/lib/utils";
import type { CampaignStatus, AmbassadorStatus } from "@/lib/types";

type Status = CampaignStatus | AmbassadorStatus;

const styles: Record<Status, string> = {
  // Campaigns
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-status-info/15 text-status-info",
  active: "bg-brand/15 text-brand",
  paused: "bg-status-warning/15 text-status-warning",
  ended: "bg-muted text-muted-foreground",
  archived: "bg-muted/60 text-muted-foreground",
  // Ambassadors
  pending: "bg-status-warning/15 text-status-warning",
  approved: "bg-brand/15 text-brand",
  rejected: "bg-status-danger/15 text-status-danger",
  suspended: "bg-status-warning/15 text-status-warning",
  removed: "bg-muted/60 text-muted-foreground",
};

const labels: Record<Status, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
  archived: "Archived",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
  removed: "Removed",
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
