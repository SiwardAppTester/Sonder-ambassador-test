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
import { formatPoints } from "@/lib/format";

/**
 * Stacked area: points awarded (brand) vs points redeemed (desaturated red).
 * Awarded stacks above the X axis; redeemed plots as positive but in a
 * separate band so the eye can compare flows at a glance.
 */
export function PointsFlowChart({
  data,
}: {
  data: { date: string; awarded: number; redeemed: number }[];
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="awardedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartTheme.primary} stopOpacity={0.55} />
              <stop offset="100%" stopColor={chartTheme.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="redeemedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0 45% 62%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(0 45% 62%)" stopOpacity={0} />
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
            tickFormatter={(v: number) => formatPoints(v)}
            {...axisStyle}
            tickMargin={4}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: chartTheme.grid, strokeWidth: 1 }}
            content={<ChartTooltip formatter={(v) => formatPoints(v)} />}
          />
          <Area
            type="monotone"
            dataKey="awarded"
            name="Awarded"
            stackId="1"
            stroke={chartTheme.primary}
            strokeWidth={2}
            fill="url(#awardedGradient)"
          />
          <Area
            type="monotone"
            dataKey="redeemed"
            name="Redeemed"
            stackId="1"
            stroke="hsl(0 45% 62%)"
            strokeWidth={1.5}
            fill="url(#redeemedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
