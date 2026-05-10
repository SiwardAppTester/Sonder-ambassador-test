"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisStyle, chartTheme } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";
import { formatCount } from "@/lib/format";

/**
 * Two-series line chart used on the campaign detail page:
 *   - Views (primary, brand color)
 *   - Shares (secondary, desaturated neutral)
 */
export function PerformanceLineChart({
  data,
}: {
  data: { date: string; views: number; shares: number }[];
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={chartTheme.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            {...axisStyle}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v: number) => formatCount(v)}
            {...axisStyle}
            tickMargin={4}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: chartTheme.grid, strokeWidth: 1 }}
            content={
              <ChartTooltip formatter={(v) => formatCount(v)} />
            }
          />
          <Line
            type="monotone"
            dataKey="views"
            name="Views"
            stroke={chartTheme.primary}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="shares"
            name="Shares"
            stroke={chartTheme.secondary}
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
