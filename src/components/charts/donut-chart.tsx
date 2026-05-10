"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chartSlots, chartTheme } from "./chart-theme";

type Slice = { label: string; value: number };

/**
 * Donut + legend list. Used for sharer demographics on the Overview
 * dashboard. Slices use the brand-anchored slot palette so the largest
 * group is visually elevated; the rest decay through neutral grays.
 */
export function DonutChart({
  data,
  ariaLabel,
}: {
  data: Slice[];
  ariaLabel: string;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="size-[130px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={1}
              stroke="none"
              isAnimationActive={false}
              aria-label={ariaLabel}
            >
              {data.map((d, i) => (
                <Cell key={d.label} fill={chartSlots[i % chartSlots.length]} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ outline: "none" }}
              contentStyle={{
                background: chartTheme.tooltipBg,
                border: `1px solid ${chartTheme.tooltipBorder}`,
                borderRadius: 6,
                fontSize: 11,
                color: "white",
                padding: "6px 10px",
              }}
              formatter={(value: number, name: string) => [
                `${value} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full space-y-1.5 text-[11px]">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: chartSlots[i % chartSlots.length] }}
            />
            <span className="flex-1 truncate text-foreground">{d.label}</span>
            <span className="shrink-0 tabular-nums font-medium text-foreground">
              {d.value}
            </span>
            <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
