"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { axisStyle, chartTheme } from "./chart-theme";
import { ChartTooltip } from "./chart-tooltip";
import { formatCount } from "@/lib/format";

/**
 * Single-series area chart used on the content detail page for views over
 * time. Uses an SVG gradient fill in the brand color — defined inline so
 * the gradient inherits the runtime brand color.
 */
export function ViewsAreaChart({
  data,
}: {
  data: { date: string; views: number }[];
}) {
  return (
    <div className="size-full min-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartTheme.primary} stopOpacity={0.45} />
              <stop offset="100%" stopColor={chartTheme.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            content={<ChartTooltip formatter={(v) => formatCount(v)} />}
          />
          <Area
            type="monotone"
            dataKey="views"
            name="Views"
            stroke={chartTheme.primary}
            strokeWidth={2}
            fill="url(#brandGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
