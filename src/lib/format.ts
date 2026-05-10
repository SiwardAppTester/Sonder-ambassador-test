/**
 * Money + number formatters. Currency comes from the org settings.
 *
 * `formatMoney` accepts negative numbers (campaigns can technically run
 * money_saved < 0 if `platform_share_cost > cpv * views/share`).
 */

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");

export function formatCount(n: number): string {
  return Math.abs(n) >= 10_000 ? compact.format(n) : full.format(n);
}

export function formatPoints(n: number): string {
  return formatCount(n);
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = "EUR"): string {
  const key = `${currency}-compact`;
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: Math.abs(amount) >= 10_000 ? "compact" : "standard",
    });
    moneyFormatters.set(key, f);
  }
  return f.format(amount);
}

export function formatPercent(n: number, fractionDigits = 0): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(fractionDigits)}%`;
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "—";
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const s = start ? fmt.format(new Date(start)) : "?";
  const e = end ? fmt.format(new Date(end)) : "?";
  return `${s} → ${e}`;
}
