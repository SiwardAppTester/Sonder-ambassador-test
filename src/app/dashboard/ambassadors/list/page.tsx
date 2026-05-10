"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { Input } from "@/components/ui/input";
import { Tabs, TabPanel, type TabItem } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { AmbassadorCard } from "@/components/ambassadors/ambassador-card";
import { RejectApplicationDialog } from "@/components/ambassadors/reject-application-dialog";
import {
  useAmbassadors,
  usePendingApplicationCount,
} from "@/hooks/use-ambassadors";
import type { Ambassador, AmbassadorStatus } from "@/lib/types";
import { contentShares } from "@/lib/mock/data";

type TabValue = "approved" | "pending" | "rejected" | "suspended";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently joined" },
  { value: "points", label: "Most points earned" },
  { value: "shares", label: "Most shares" },
  { value: "followers", label: "Most followers" },
];

type SortKey = "recent" | "points" | "shares" | "followers";

export default function AmbassadorsListPage() {
  const t = useTranslations("Ambassadors.List");
  const [tab, setTab] = useState<TabValue>("approved");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [rejectTarget, setRejectTarget] = useState<Ambassador | null>(null);

  const { data: pendingCount } = usePendingApplicationCount();

  const tabs: TabItem<TabValue>[] = [
    { value: "approved", label: t("tabs.approved") },
    { value: "pending", label: t("tabs.pending"), badge: pendingCount },
    { value: "rejected", label: t("tabs.rejected") },
    { value: "suspended", label: t("tabs.suspended") },
  ];

  return (
    <PermissionGuard permissions={["ambassador.list.view"]}>
      <PageShell title={t("title")}>
        <Tabs value={tab} onChange={setTab} items={tabs} ariaLabel="Ambassador status" />

        <div className="mt-5 mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or handle…"
              className="pl-8"
            />
          </div>
          {tab === "approved" || tab === "suspended" ? (
            <Select
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
              ariaLabel="Sort ambassadors"
            />
          ) : null}
        </div>

        <TabPanel active={tab === "approved"}>
          <Grid status="approved" search={search} sort={sort} onReject={setRejectTarget} />
        </TabPanel>
        <TabPanel active={tab === "pending"}>
          <Grid status="pending" search={search} sort="recent" onReject={setRejectTarget} />
        </TabPanel>
        <TabPanel active={tab === "rejected"}>
          <Grid status="rejected" search={search} sort="recent" onReject={setRejectTarget} />
        </TabPanel>
        <TabPanel active={tab === "suspended"}>
          <Grid status="suspended" search={search} sort={sort} onReject={setRejectTarget} />
        </TabPanel>

        <RejectApplicationDialog
          open={!!rejectTarget}
          onClose={() => setRejectTarget(null)}
          ambassadorId={rejectTarget?.id ?? null}
          ambassadorName={
            rejectTarget
              ? `${rejectTarget.firstName ?? ""} ${rejectTarget.lastName ?? ""}`.trim() ||
                rejectTarget.instagramHandle ||
                ""
              : ""
          }
        />
      </PageShell>
    </PermissionGuard>
  );
}

function Grid({
  status,
  search,
  sort,
  onReject,
}: {
  status: AmbassadorStatus;
  search: string;
  sort: SortKey;
  onReject: (a: Ambassador) => void;
}) {
  const t = useTranslations("Ambassadors.List.empty");
  const { data, isLoading } = useAmbassadors(status, search);

  const sorted = useMemo(() => {
    if (!data) return [];
    if (sort === "recent") return data; // hook already returns app-order
    const arr = [...data];
    arr.sort((a, b) => {
      switch (sort) {
        case "points":
          return b.lifetimePointsEarned - a.lifetimePointsEarned;
        case "shares": {
          const aS = contentShares.filter((s) => s.ambassadorId === a.id).length;
          const bS = contentShares.filter((s) => s.ambassadorId === b.id).length;
          return bS - aS;
        }
        case "followers":
          return b.instagramFollowerCount - a.instagramFollowerCount;
        default:
          return 0;
      }
    });
    return arr;
  }, [data, sort]);

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="size-[20px] animate-spin text-foreground" />
      </div>
    );
  }

  if (!sorted || sorted.length === 0) {
    const emptyKey = status === "pending" ? "pending" : status === "approved" ? "approved" : null;
    return (
      <div className="flex h-[36vh] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 px-6 text-center">
        <p className="text-sm font-medium text-foreground">
          {emptyKey ? t(`${emptyKey}.title`) : "Nothing here"}
        </p>
        {emptyKey ? (
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {t(`${emptyKey}.description`)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sorted.map((a, i) => (
        <AmbassadorCard key={a.id} ambassador={a} index={i} onReject={onReject} />
      ))}
    </div>
  );
}
