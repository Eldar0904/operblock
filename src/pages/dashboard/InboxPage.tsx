import { useMemo, useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import {
  useAllTasks,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
} from "@/hooks/useTasks";
import { useMembers, useProjects } from "@/hooks/useProjects";
import { ListView } from "@/components/dashboard/ListView";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import type { ApiTask } from "@/lib/mock-data";
import { TaskModal, type TaskFormData } from "@/components/dashboard/TaskModal";
import { useToast } from "@/components/ui/toast";

export default function InboxPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { userId } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [], isLoading, isError } = useAllTasks();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const inboxTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.status === "in_review" && projectIds.has(task.projectId),
      ),
    [tasks, projectIds],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);

  const openEditModal = (task: ApiTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleModalSubmit = (form: TaskFormData) => {
    if (!editingTask) return;
    updateTask.mutate(
      {
        id: editingTask.id,
        title: form.title.trim(),
        description: form.description || null,
        status: form.status,
        priority: form.priority || null,
        dueDate: form.dueDate || null,
        assigneeUserId: form.assigneeUserId,
      },
      { onSuccess: () => setModalOpen(false) },
    );
  };

  const handleApprove = (task: ApiTask) => {
    updateStatus.mutate(
      { id: task.id, status: "done" },
      {
        onSuccess: () => showToast(t("inbox.approved"), "success"),
      },
    );
  };

  const handleDelete = (task: ApiTask) => {
    if (window.confirm(t("projects.deleteConfirm", { title: task.title }))) {
      deleteTask.mutate(task.id);
    }
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("inbox.reviewQueue")}</p>
          <h1 className="text-base font-semibold">
            {t("inbox.title")}
            {inboxTasks.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({inboxTasks.length})
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("inbox.loading")}</p>
        ) : isError ? (
          <p className="text-sm text-red-600">{t("inbox.loadError")}</p>
        ) : inboxTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-indigo-50 p-4">
              <InboxIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-base font-semibold">{t("inbox.clear")}</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("inbox.clearDesc")}</p>
          </div>
        ) : (
          <ListView
            tasks={inboxTasks}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onApprove={handleApprove}
            showProject
            projectNameById={projectNameById}
          />
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        task={editingTask}
        isSubmitting={updateTask.isPending}
        currentUserId={userId ?? undefined}
        members={members}
      />
    </>
  );
}
