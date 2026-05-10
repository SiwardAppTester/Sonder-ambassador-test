import { cn } from "@/lib/utils";

/**
 * Thin brand-color progress bar.
 * Used for campaign cap meters and reward stock indicators.
 */
export function Progress({
  value,
  max = 1,
  className,
}: {
  value: number;
  max?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full brand-progress transition-[width] duration-300"
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}
