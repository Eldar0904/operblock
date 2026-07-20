export type ReportPeriod = "week" | "month" | "quarter" | "year";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getWeekRange(anchor: Date): DateRange {
  const d = startOfDay(anchor);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: startOfDay(start),
    end: endOfDay(end),
    label: `${formatShort(start)} – ${formatShort(end)}, ${start.getFullYear()}`,
  };
}

function getMonthRange(anchor: Date): DateRange {
  const start = startOfDay(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const end = endOfDay(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
  return { start, end, label: formatMonthYear(start) };
}

function getQuarterRange(anchor: Date): DateRange {
  const q = Math.floor(anchor.getMonth() / 3);
  const start = startOfDay(new Date(anchor.getFullYear(), q * 3, 1));
  const end = endOfDay(new Date(anchor.getFullYear(), q * 3 + 3, 0));
  return { start, end, label: `Q${q + 1} ${start.getFullYear()}` };
}

function getYearRange(anchor: Date): DateRange {
  const start = startOfDay(new Date(anchor.getFullYear(), 0, 1));
  const end = endOfDay(new Date(anchor.getFullYear(), 11, 31));
  return { start, end, label: `${start.getFullYear()}` };
}

export function getPeriodRange(period: ReportPeriod, anchor: Date): DateRange {
  switch (period) {
    case "week":
      return getWeekRange(anchor);
    case "month":
      return getMonthRange(anchor);
    case "quarter":
      return getQuarterRange(anchor);
    case "year":
      return getYearRange(anchor);
  }
}

export function getPreviousPeriodRange(period: ReportPeriod, anchor: Date): DateRange {
  const prev = new Date(anchor);
  switch (period) {
    case "week":
      prev.setDate(prev.getDate() - 7);
      return getWeekRange(prev);
    case "month":
      prev.setMonth(prev.getMonth() - 1);
      return getMonthRange(prev);
    case "quarter":
      prev.setMonth(prev.getMonth() - 3);
      return getQuarterRange(prev);
    case "year":
      prev.setFullYear(prev.getFullYear() - 1);
      return getYearRange(prev);
  }
}

export interface ThroughputBucket {
  bucket: string;
  count: number;
  start: Date;
  end: Date;
}

export function buildThroughputBuckets(
  period: ReportPeriod,
  range: DateRange,
): ThroughputBucket[] {
  const buckets: ThroughputBucket[] = [];

  if (period === "week") {
    for (let i = 0; i < 7; i++) {
      const start = new Date(range.start);
      start.setDate(range.start.getDate() + i);
      const end = endOfDay(start);
      const label = start.toLocaleDateString("en-US", { weekday: "short" });
      buckets.push({ bucket: label, count: 0, start: startOfDay(start), end });
    }
    return buckets;
  }

  if (period === "month") {
    let cursor = new Date(range.start);
    let weekNum = 1;
    while (cursor <= range.end) {
      const start = startOfDay(new Date(cursor));
      const end = endOfDay(new Date(cursor));
      end.setDate(end.getDate() + 6);
      if (end > range.end) end.setTime(range.end.getTime());
      buckets.push({ bucket: `W${weekNum}`, count: 0, start, end });
      cursor = new Date(end);
      cursor.setDate(cursor.getDate() + 1);
      weekNum++;
    }
    return buckets;
  }

  if (period === "quarter") {
    for (let m = 0; m < 3; m++) {
      const monthIndex = range.start.getMonth() + m;
      const start = startOfDay(new Date(range.start.getFullYear(), monthIndex, 1));
      const end = endOfDay(new Date(range.start.getFullYear(), monthIndex + 1, 0));
      const label = start.toLocaleDateString("en-US", { month: "short" });
      buckets.push({ bucket: label, count: 0, start, end });
    }
    return buckets;
  }

  for (let q = 0; q < 4; q++) {
    const start = startOfDay(new Date(range.start.getFullYear(), q * 3, 1));
    const end = endOfDay(new Date(range.start.getFullYear(), q * 3 + 3, 0));
    buckets.push({ bucket: `Q${q + 1}`, count: 0, start, end });
  }
  return buckets;
}

export function isInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function parseAnchor(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};
