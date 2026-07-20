import { useTranslation } from "react-i18next";
import type { Priority, TaskStatus } from "@/lib/mock-data";
import { COLUMN_CONFIG } from "@/lib/mock-data";
import type { ReportPeriod } from "@/lib/report-utils";

export function useStatusLabel() {
  const { t } = useTranslation();
  return (status: TaskStatus) => t(`status.${status}`);
}

export function usePriorityLabel() {
  const { t } = useTranslation();
  return (priority: Priority | "none" | "all" | "" | null | undefined) => {
    if (!priority || priority === "none") return t("priority.unspecified");
    if (priority === "all") return t("priority.all");
    return t(`priority.${priority}`);
  };
}

export function useColumnConfig() {
  const { t } = useTranslation();
  return COLUMN_CONFIG.map((col) => ({
    ...col,
    title: t(`status.${col.id}`),
  }));
}

export function usePeriodLabels(): Record<ReportPeriod, string> {
  const { t } = useTranslation();
  return {
    week: t("reports.period.week"),
    month: t("reports.period.month"),
    quarter: t("reports.period.quarter"),
    year: t("reports.period.year"),
  };
}

export function useReportFormatters() {
  const { t, i18n } = useTranslation();

  return {
    formatDelta: (delta: number) => {
      if (delta === 0) return t("reports.noChange");
      const sign = delta > 0 ? "+" : "";
      return t("reports.vsPrior", { value: `${sign}${delta}` });
    },
    formatDeltaPct: (current: number, previous: number) => {
      if (previous === 0) {
        return current > 0 ? "+100%" : t("reports.noPriorData");
      }
      const pct = Math.round(((current - previous) / previous) * 100);
      const sign = pct > 0 ? "+" : "";
      return t("reports.vsPrior", { value: `${sign}${pct}%` });
    },
    priorityLabel: (priority: string) => {
      if (priority === "none") return t("priority.unspecified");
      return t(`priority.${priority}`, { defaultValue: priority });
    },
    assigneeLabel: (userId: string) => {
      if (userId === "unassigned") return t("reports.unassigned");
      return userId.length > 12 ? `${userId.slice(0, 8)}…` : userId;
    },
    formatCompletedDate: (iso?: string) => {
      if (!iso) return "—";
      const locale = i18n.language === "kk" ? "kk-KZ" : "ru-RU";
      return new Date(iso).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
  };
}
