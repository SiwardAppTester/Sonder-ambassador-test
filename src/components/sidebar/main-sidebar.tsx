"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, FileText, Users, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandCustomizer } from "@/components/sidebar/brand-customizer";
import { ThemeToggle } from "@/components/sidebar/theme-toggle";
import type { ReactNode } from "react";

type Item = {
  href: string;
  labelKey: "content" | "dashboard" | "roles" | "ambassadors" | "settings";
  icon: ReactNode;
};

const ITEMS: readonly Item[] = [
  { href: "/dashboard/content", labelKey: "content", icon: <FileText className="size-[18px]" /> },
  {
    href: "/dashboard",
    labelKey: "dashboard",
    icon: <LayoutDashboard className="size-[18px]" />,
  },
  { href: "/dashboard/roles", labelKey: "roles", icon: <ShieldCheck className="size-[18px]" /> },
  {
    href: "/dashboard/ambassadors",
    labelKey: "ambassadors",
    icon: <Users className="size-[18px]" />,
  },
  { href: "/dashboard/settings", labelKey: "settings", icon: <Settings className="size-[18px]" /> },
];

export function MainSidebar() {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();

  return (
    <aside className="surface-glass-strong relative flex h-full w-[72px] shrink-0 flex-col items-center border-r border-border/60 py-5">
      <div className="mb-6 flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground text-sm font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.5)]">
        S
      </div>
      <nav className="flex flex-col items-center gap-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={t(item.labelKey)}
              className={cn(
                "flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                active && "bg-muted text-foreground",
              )}
            >
              {item.icon}
            </Link>
          );
        })}
        <BrandCustomizer />
        <ThemeToggle />
      </nav>
    </aside>
  );
}
