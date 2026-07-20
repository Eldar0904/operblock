export type ReportPeriod = "week" | "month" | "quarter" | "year";

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

export const PERIOD_OPTIONS: ReportPeriod[] = ["week", "month", "quarter", "year"];

export function formatDelta(delta: number): string {
  if (delta === 0) return "No change";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta} vs prior period`;
}

export function formatDeltaPct(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+100%" : "No prior data";
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs prior period`;
}

export function priorityLabel(priority: string): string {
  if (priority === "none") return "Unspecified";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function assigneeLabel(userId: string): string {
  if (userId === "unassigned") return "Unassigned";
  return userId.length > 12 ? `${userId.slice(0, 8)}…` : userId;
}

export function formatCompletedDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
