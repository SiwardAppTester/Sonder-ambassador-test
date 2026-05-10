"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";

/**
 * Standard page wrapper used by every Ambassadors page. Provides padding,
 * a header band with breadcrumbs + title + optional actions, and the
 * brief's mount animation (`opacity 0,y 20 → opacity 1,y 0`, 0.5s easeOut).
 *
 * Breadcrumbs sit above the title in the top-left and replace per-page
 * "back" buttons. Leave `breadcrumbs` undefined on top-level pages.
 */
export function PageShell({
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: {
  title: string;
  description?: string;
  breadcrumbs?: readonly Crumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex min-h-full flex-col px-8 py-7"
    >
      <header className="mb-6">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        <div className="flex min-h-9 items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}

/** Generic placeholder body — used by phase-1 route shells. */
export function PagePlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[60vh] items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
