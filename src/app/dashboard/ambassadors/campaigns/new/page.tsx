import { PageShell, PagePlaceholder } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";

export default function NewCampaignPage() {
  return (
    <PermissionGuard permissions={["ambassador.campaign.manage"]}>
      <PageShell title="New campaign">
        <PagePlaceholder>Create-campaign form — coming in phase 4</PagePlaceholder>
      </PageShell>
    </PermissionGuard>
  );
}
