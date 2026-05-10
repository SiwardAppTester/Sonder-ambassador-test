/**
 * Shared chart theme tokens. Recharts takes inline color props, so we
 * centralize the values here rather than chasing magic strings across
 * components. Brand color is read from the same CSS variable the rest
 * of the app uses, so per-org theming flows in automatically.
 */

export const chartTheme = {
  // Primary series — brand color, full strength.
  primary: "rgb(var(--brand-rgb))",
  // Secondary series — desaturated neutral, the brief's "neutral" rule.
  secondary: "rgb(168 168 168)",
  // Grid lines — barely visible.
  grid: "rgba(255, 255, 255, 0.06)",
  // Axis text — muted-foreground equivalent.
  axis: "rgb(168 168 168)",
  // Tooltip background — popover-ish but with a hint of glass.
  tooltipBg: "rgba(36, 36, 36, 0.96)",
  tooltipBorder: "rgba(255, 255, 255, 0.08)",
};

/**
 * Slot palette for charts that need more than one or two colors (donut slices).
 * The first slot is the brand color; the rest are desaturated neutrals
 * descending in luminance — matches the brief's "primary in brand, secondary
 * in desaturated neutral" rule.
 */
export const chartSlots = [
  "rgb(var(--brand-rgb))",
  "rgb(168 168 168)",
  "rgb(132 132 132)",
  "rgb(102 102 102)",
  "rgb(78 78 78)",
  "rgb(58 58 58)",
];

export const axisStyle = {
  tick: { fill: chartTheme.axis, fontSize: 11 },
  axisLine: { stroke: "transparent" },
  tickLine: { stroke: "transparent" },
};
