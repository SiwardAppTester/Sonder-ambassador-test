"use client";

import type { TooltipProps } from "recharts";
import { chartTheme } from "./chart-theme";

/**
 * Custom Recharts tooltip — matches the dark theme. No animated reveal,
 * no decorative gradients (per the brief).
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: TooltipProps<number, string> & {
  formatter?: (value: number, key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-md"
      style={{
        background: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        backdropFilter: "blur(8px)",
      }}
    >
      {label !== undefined ? (
        <div className="mb-1 text-muted-foreground tabular-nums">{label}</div>
      ) : null}
      <div className="space-y-0.5">
        {payload.map((p) => (
          <div key={p.dataKey as string} className="flex items-center gap-2">
            <span
              className="size-1.5 rounded-full"
              style={{ background: p.color ?? chartTheme.primary }}
            />
            <span className="text-foreground tabular-nums">
              {formatter && typeof p.value === "number"
                ? formatter(p.value, String(p.dataKey))
                : p.value}
            </span>
            <span className="text-muted-foreground">
              {String(p.name ?? p.dataKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
