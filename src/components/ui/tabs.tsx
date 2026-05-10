"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Lightweight tabs. Controlled via `value`/`onChange` so the parent can
 * sync to URL params. The active item is brand-color-tinted with a
 * 1px brand underline — matches the secondary sidebar's accent treatment.
 */
type TabValue = string;

export type TabItem<T extends TabValue = TabValue> = {
  value: T;
  label: string;
  badge?: number;
};

export function Tabs<T extends TabValue>({
  value,
  onChange,
  items,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  items: readonly TabItem<T>[];
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-1 border-b border-border/60"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {typeof item.badge === "number" && item.badge > 0 ? (
              <span
                className={cn(
                  "inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.badge}
              </span>
            ) : null}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-px bg-brand"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  if (!active) return null;
  return (
    <div role="tabpanel" className="pt-5">
      {children}
    </div>
  );
}
