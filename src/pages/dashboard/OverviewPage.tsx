import { useUser, UserButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BoardView } from "@/components/dashboard/BoardView";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useDailyProject } from "@/hooks/useProjects";
import { useAllTasks, useDeleteTask, useUpdateTaskStatus } from "@/hooks/useTasks";
import { getTaskAssigneeIds } from "@/lib/task-status";
import type { TaskStatus } from "@/lib/mock-data";

export default function OverviewPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useAllTasks();
  const { data: dailyProject, isLoading: dailyLoading } = useDailyProject();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const isLoading = tasksLoading || dailyLoading;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const hour = now.getHours();
  const period = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const name = user?.firstName ?? user?.username ?? t("overview.defaultName");
  const myTasks = tasks.filter(
    (task) => dailyProject?.id === task.projectId && Boolean(user?.id) && getTaskAssigneeIds(task).includes(user!.id),
  );

  const handleDelete = (task: (typeof myTasks)[number]) => {
    if (window.confirm(t("projects.deleteConfirm", { title: task.title }))) deleteTask.mutate(task.id);
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("overview.dashboard")}</p>
          <h1 className="text-base font-semibold">{t(`overview.greeting.${period}`, { name })}</h1>
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
          <div className="flex h-full min-h-[520px] flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold">{t("overview.myWorkTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("overview.myWorkSubtitle")}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-x-auto">
              <BoardView
                tasks={myTasks}
                onDragStart={setDraggingTaskId}
                onDrop={(status) => {
                  if (!draggingTaskId) return;
                  const task = myTasks.find((item) => item.id === draggingTaskId);
                  if (task && task.status !== status) updateStatus.mutate({ id: task.id, status });
                  setDraggingTaskId(null);
                  setDropTarget(null);
                }}
                dropTarget={dropTarget}
                setDropTarget={setDropTarget}
                onEdit={() => navigate("/dashboard/daily")}
                onDelete={handleDelete}
                onAddToColumn={() => navigate("/dashboard/daily")}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
