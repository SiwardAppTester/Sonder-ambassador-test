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
 * Single-series area: total reach over time. Brand color, gradient fill —
 * the hero chart on the Overview dashboard.
 */
export function ReachLineChart({ data }: { data: { date: string; reach: number }[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
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
            dataKey="reach"
            name="Reach"
            stroke={chartTheme.primary}
            strokeWidth={2}
            fill="url(#reachGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
