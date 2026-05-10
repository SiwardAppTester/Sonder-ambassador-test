"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Megaphone, LineChart, Gift, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingApplicationCount } from "@/hooks/use-ambassadors";
import { useRealtimePendingApplications } from "@/hooks/use-realtime";
import { useOrganization } from "@/providers/organization-provider";
import type { ReactNode } from "react";

type LabelKey = "campaigns" | "overview" | "rewards" | "list";

type Item = {
  href: string;
  labelKey: LabelKey;
  icon: ReactNode;
};

const ITEMS: readonly Item[] = [
  {
    href: "/dashboard/ambassadors/campaigns",
    labelKey: "campaigns",
    icon: <Megaphone className="size-[18px]" />,
  },
  {
    href: "/dashboard/ambassadors/overview",
    labelKey: "overview",
    icon: <LineChart className="size-[18px]" />,
  },
  {
    href: "/dashboard/ambassadors/rewards",
    labelKey: "rewards",
    icon: <Gift className="size-[18px]" />,
  },
  {
    href: "/dashboard/ambassadors/list",
    labelKey: "list",
    icon: <Users className="size-[18px]" />,
  },
];

export function AmbassadorsSecondarySidebar() {
  const t = useTranslations("Ambassadors.subnav");
  const tTitle = useTranslations("Ambassadors");
  const pathname = usePathname();
  const org = useOrganization();
  useRealtimePendingApplications(org.id);
  const { data: pendingCount } = usePendingApplicationCount();
  const badges: Partial<Record<LabelKey, number | undefined>> = { list: pendingCount };

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="surface-glass relative flex h-full w-[220px] shrink-0 flex-col border-r border-border/60"
    >
      <div className="px-4 pb-3 pt-5 text-sm font-semibold text-foreground">{tTitle("title")}</div>
      <nav className="flex flex-col gap-0.5 px-2">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                active && "bg-brand/10 text-brand",
              )}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "transition-colors",
                    active ? "text-brand" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {item.icon}
                </span>
                {t(item.labelKey)}
              </span>
              {(() => {
                const badge = badges[item.labelKey];
                return typeof badge === "number" && badge > 0 ? (
                  <span className="rounded-full bg-status-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-status-warning tabular-nums">
                    {badge}
                  </span>
                ) : null;
              })()}
            </Link>
          );
        })}
      </nav>
    </motion.aside>
  );
}
