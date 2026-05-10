import { AmbassadorsSecondarySidebar } from "@/components/sidebar/ambassadors-secondary-sidebar";
import { PermissionGuard } from "@/components/permission-guard";
import type { ReactNode } from "react";

/**
 * Anyone landing on /dashboard/ambassadors needs at minimum one of the
 * ambassador.*.view permissions. Sub-pages add their own narrower guards.
 */
const ENTRY_PERMISSIONS = [
  "ambassador.campaign.view",
  "ambassador.overview.view",
  "ambassador.reward.view",
  "ambassador.list.view",
];

export default function AmbassadorsLayout({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard
      permissions={ENTRY_PERMISSIONS}
      mode="any"
      fallback={
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          You don&apos;t have access to the Ambassadors area.
        </div>
      }
    >
      <div className="flex h-full w-full">
        <AmbassadorsSecondarySidebar />
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </PermissionGuard>
  );
}
