"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = {
  /** Display label for this segment. */
  label: string;
  /** If set, this crumb is a link. Last crumb (current page) is usually `undefined`. */
  href?: string;
};

/**
 * Breadcrumbs — sits above the page title in the header. Each segment is
 * a link back to that level except the last (the current page). Used as
 * the primary back-navigation across detail pages, replacing per-page
 * "back" buttons.
 *
 * Renders nothing when fewer than 2 crumbs are passed — a single crumb
 * would just be the page title repeated, which is noise.
 */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  if (items.length < 2) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${i}-${c.label}`}>
            {i > 0 ? (
              <ChevronRight aria-hidden className="size-3 shrink-0 opacity-50" />
            ) : null}
            {c.href && !isLast ? (
              <Link
                href={c.href}
                className="truncate transition-colors hover:text-foreground"
              >
                {c.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={cn(
                  "truncate",
                  isLast && "text-foreground",
                )}
              >
                {c.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
