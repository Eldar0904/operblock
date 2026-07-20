import { useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { ReportsView } from "@/components/dashboard/ReportsView";
import { useProjects } from "@/hooks/useProjects";
import { useReports } from "@/hooks/useReports";
import type { ReportPeriod } from "@/lib/report-utils";

export default function ReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [projectFilter, setProjectFilter] = useState("");
  const { data: projects = [] } = useProjects();
  const { data, isLoading, isError, error } = useReports(period, {
    projectId: projectFilter || undefined,
  });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-600" />
          <div>
            <p className="text-xs text-muted-foreground">{t("reports.subtitle")}</p>
            <h1 className="text-base font-semibold">{t("reports.title")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("reports.loading")}</p>
        )}
        {isError && (
          <p className="text-sm text-red-600">
            {t("reports.loadError")}: {error instanceof Error ? error.message : t("common.unknown")}
          </p>
        )}
        {data && (
          <ReportsView
            data={data}
            period={period}
            projectFilter={projectFilter}
            projects={projects}
            onPeriodChange={setPeriod}
            onProjectChange={setProjectFilter}
          />
        )}
      </div>
    </>
  );
}
