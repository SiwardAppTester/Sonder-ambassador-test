"use client";

import type { OverviewRange } from "@/lib/mock/data";

const OPTIONS: { value: OverviewRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

export function RangePicker({
  value,
  onChange,
}: {
  value: OverviewRange;
  onChange: (next: OverviewRange) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-background/40 p-0.5">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              "rounded-[5px] px-3 py-1 text-xs font-medium transition-colors " +
              (active
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
