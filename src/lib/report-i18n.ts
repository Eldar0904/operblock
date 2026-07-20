import i18n from "@/i18n";
import type { ReportPeriod } from "@/lib/report-utils";

function locale(): string {
  return i18n.language === "kk" ? "kk-KZ" : "ru-RU";
}

export function formatPeriodLabel(
  period: ReportPeriod,
  startIso: string,
  endIso: string,
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const loc = locale();

  switch (period) {
    case "week":
      return `${start.toLocaleDateString(loc, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(loc, { month: "short", day: "numeric" })}, ${start.getFullYear()}`;
    case "month":
      return start.toLocaleDateString(loc, { month: "long", year: "numeric" });
    case "quarter": {
      const q = Math.floor(start.getMonth() / 3) + 1;
      return i18n.language === "kk"
        ? `${start.getFullYear()}, ${q}-тоқсан`
        : `${q}-й квартал ${start.getFullYear()}`;
    }
    case "year":
      return `${start.getFullYear()}`;
  }
}

export function localizeThroughputBuckets(
  period: ReportPeriod,
  periodStartIso: string,
  buckets: { bucket: string; count: number }[],
): { bucket: string; count: number }[] {
  const loc = locale();
  const periodStart = new Date(periodStartIso);

  if (period === "week") {
    return buckets.map((item, i) => {
      const d = new Date(periodStart);
      d.setDate(d.getDate() + i);
      return {
        ...item,
        bucket: d.toLocaleDateString(loc, { weekday: "short" }),
      };
    });
  }

  if (period === "month") {
    return buckets.map((item, i) => ({
      ...item,
      bucket: i18n.language === "kk" ? `${i + 1}-апта` : `Н${i + 1}`,
    }));
  }

  if (period === "quarter") {
    return buckets.map((item, i) => {
      const d = new Date(periodStart.getFullYear(), periodStart.getMonth() + i, 1);
      return {
        ...item,
        bucket: d.toLocaleDateString(loc, { month: "short" }),
      };
    });
  }

  return buckets.map((item, i) => ({
    ...item,
    bucket: i18n.language === "kk" ? `${i + 1}-тоқсан` : `Q${i + 1}`,
  }));
}
