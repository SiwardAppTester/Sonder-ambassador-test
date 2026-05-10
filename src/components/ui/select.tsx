"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

/**
 * Custom select with a dark-themed dropdown menu. Replaces the native
 * <select> so the popup matches the rest of the surface (the native
 * dropdown is browser-rendered and unstylable).
 *
 * Closes on outside click and Escape. Not a full combobox — no type-ahead
 * yet — but enough for short option lists like filters and sort menus.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = "md",
}: {
  value: T;
  onChange: (next: T) => void;
  options: SelectOption<T>[];
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const heightClass = size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3 text-sm";

  return (
    <div ref={wrapRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "field-fill inline-flex items-center gap-1.5 rounded-lg border border-border/40 text-foreground transition-colors",
          "hover:border-border/70",
          "focus-visible:outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20",
          heightClass,
        )}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-30 mt-1.5 min-w-full overflow-hidden rounded-xl border border-border/40 surface-glass-strong p-1 surface-floating"
        >
          <div className="max-h-72 overflow-y-auto">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-colors",
                    selected ? "bg-muted/60" : "hover:bg-muted/50",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected ? (
                    <Check className="size-3.5 shrink-0 text-brand" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
