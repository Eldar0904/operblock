import { useUser, UserButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { BoardView } from "@/components/dashboard/BoardView";
import { TaskModal, type TaskFormData } from "@/components/dashboard/TaskModal";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useDailyProject, useMembersList } from "@/hooks/useProjects";
import { useAllTasks, useCreateTask, useDeleteTask, useUpdateTaskStatus } from "@/hooks/useTasks";
import { useUploadPendingAttachments } from "@/hooks/useUploadPendingAttachments";
import { getTaskAssigneeIds } from "@/lib/task-status";
import type { TaskStatus } from "@/lib/mock-data";

export default function OverviewPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useAllTasks();
  const { data: dailyProject, isLoading: dailyLoading } = useDailyProject();
  const members = useMembersList();
  const createTask = useCreateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const uploadPendingAttachments = useUploadPendingAttachments();
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
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
  const doneCount = myTasks.filter((task) => task.status === "done").length;
  const openCount = myTasks.length - doneCount;

  const handleDelete = (task: (typeof myTasks)[number]) => {
    if (window.confirm(t("projects.deleteConfirm", { title: task.title }))) deleteTask.mutate(task.id);
  };

  const handleCreateTask = (form: TaskFormData, pendingFiles?: File[]) => {
    if (!dailyProject || !user?.id) return;
    createTask.mutate(
      {
        projectId: dailyProject.id,
        title: form.title.trim(),
        description: form.description || undefined,
        status: "todo",
        priority: form.priority || undefined,
        dueDate: form.dueDate || undefined,
        assigneeUserId: user.id,
        assigneeUserIds: [user.id],
      },
      {
        onSuccess: async (created) => {
          if (pendingFiles?.length) {
            setIsUploadingAttachments(true);
            try {
              await uploadPendingAttachments(created.id, pendingFiles);
            } finally {
              setIsUploadingAttachments(false);
            }
          }
          setAddTaskOpen(false);
        },
      },
    );
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
            <section className="rounded-xl border border-border bg-background p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{t("overview.myWorkEyebrow")}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">{t("overview.myWorkTitle")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t("overview.myWorkSubtitle")}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => setAddTaskOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("projects.addTask")}
                </Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
                  {t("overview.myWorkOpen", { count: openCount })}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("overview.myWorkDone", { count: doneCount })}
                </span>
              </div>
            </section>
            <section className="min-h-0 flex-1 rounded-xl border border-border bg-muted/20 p-3">
              <div className="mb-2 px-1 text-xs font-medium text-muted-foreground">{t("overview.myWorkBoard")}</div>
              <div className="h-[calc(100%-28px)] overflow-x-auto">
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
            </section>
          </div>
        )}
      </div>
      <TaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onSubmit={handleCreateTask}
        defaultStatus="todo"
        currentUserId={user?.id}
        members={members}
        defaultAssigneeToMe
        isSubmitting={createTask.isPending || isUploadingAttachments}
      />
    </>
  );
}
