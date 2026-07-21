import { UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { MomentumDashboard } from "@/components/dashboard/MomentumDashboard";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useDailyProject } from "@/hooks/useProjects";
import { useReports } from "@/hooks/useReports";
import { useAllTasks } from "@/hooks/useTasks";

export default function OverviewPage() {
  const { t } = useTranslation();
  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useAllTasks();
  const { data: dailyProject, isLoading: dailyLoading } = useDailyProject();
  const { data: weekReport, isLoading: reportsLoading } = useReports("week");

  const isLoading = tasksLoading || dailyLoading;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("overview.workspace")}</p>
          <h1 className="text-base font-semibold">{t("overview.dashboard")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("overview.loadingStats")}</p>
        ) : tasksError ? (
          <p className="text-sm text-red-600">{t("overview.loadError")}</p>
        ) : (
          <MomentumDashboard
            tasks={tasks}
            dailyProjectId={dailyProject?.id}
            weekReport={weekReport}
            reportsLoading={reportsLoading}
          />
        )}
      </div>
    </>
  );
}
