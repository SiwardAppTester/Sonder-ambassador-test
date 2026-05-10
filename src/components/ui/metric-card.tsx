import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

/**
 * Metric card. Layout:
 *   - Label + (optional) delta indicator on the same line, both small.
 *   - Big number on its own line below — the hero.
 *
 * Why delta moves up: when there's no delta (content/ambassador detail
 * pages), the value-and-delta row was leaving the value left-aligned with
 * empty space to the right, which read as off-balance. Pinning the delta
 * to the label row lets the value be its own deliberate line whether or
 * not a delta is present.
 */
export function MetricCard({
  label,
  value,
  delta,
  className,
}: {
  label: string;
  value: string;
  delta?: number;
  className?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card surface-floating px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="line-clamp-2 min-h-[2.6em] flex-1 text-[11px] font-medium uppercase leading-[1.3] tracking-wider text-muted-foreground">
          {label}
        </div>
        {typeof delta === "number" ? (
          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums",
              positive ? "text-status-positive" : "text-status-danger",
            )}
          >
            {positive ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {formatPercent(delta, 0)}
          </div>
        ) : null}
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}
