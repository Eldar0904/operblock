import { UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { useAllTasks } from "@/hooks/useTasks";
import { OverviewView } from "@/components/dashboard/OverviewView";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";

export default function OverviewPage() {
  const { t } = useTranslation();
  const { data: tasks = [], isLoading, isError } = useAllTasks();

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
        ) : isError ? (
          <p className="text-sm text-red-600">{t("overview.loadError")}</p>
        ) : (
          <OverviewView tasks={tasks} title={t("overview.workspaceTitle")} />
        )}
      </div>
    </>
  );
}
