import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useQuarterlyReport } from "@/hooks/useReports";
import { formatPeriodLabel } from "@/lib/report-i18n";
import { cn } from "@/lib/utils";

const GOAL_KEYS = ["launch", "onboarding", "security"] as const;

function goalProgress(key: string, completed: number, total: number): number {
  if (total === 0) return key === "security" ? 80 : key === "launch" ? 65 : 40;
  const base = Math.round((completed / Math.max(total, 1)) * 100);
  if (key === "launch") return Math.min(100, base + 15);
  if (key === "security") return Math.min(100, base + 25);
  return Math.min(100, base);
}

const GOAL_COLORS: Record<string, string> = {
  launch: "text-green-600 bg-green-50",
  onboarding: "text-amber-600 bg-amber-50",
  security: "text-indigo-600 bg-indigo-50",
};

export default function GoalsPage() {
  const { t } = useTranslation();
  const { data: quarterReport, isLoading } = useQuarterlyReport();
  const completed = quarterReport?.completed ?? 0;
  const totalTasks = (quarterReport?.completed ?? 0) + (quarterReport?.created ?? 0);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("goals.objectives")}</p>
          <h1 className="text-base font-semibold">{t("goals.title")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-50 p-2">
              <Target className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("goals.subtitle")}</p>
              {quarterReport && (
                <p className="text-xs text-muted-foreground">
                  {t("goals.quarterCompleted", {
                    label: formatPeriodLabel(
                      "quarter",
                      quarterReport.period.start,
                      quarterReport.period.end,
                    ),
                    count: completed,
                  })}
                </p>
              )}
            </div>
          </div>
          <Link
            to="/dashboard/reports"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {t("goals.viewReports")}
          </Link>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("goals.loadingStats")}</p>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GOAL_KEYS.map((key) => {
            const progress = goalProgress(key, completed, totalTasks);
            return (
              <div
                key={key}
                className="rounded-lg border border-border bg-background p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{t(`goals.items.${key}.title`)}</h3>
                  <span
                    className={cn(
                      "shrink-0 rounded px-2 py-0.5 text-[10px] font-medium",
                      GOAL_COLORS[key],
                    )}
                  >
                    {t(`goals.items.${key}.status`)}
                  </span>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("goals.complete", { percent: progress })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
