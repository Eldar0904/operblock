import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/useTasks";
import type { ApiTask, Priority } from "@/lib/mock-data";
import { filterTasks } from "@/lib/task-utils";
import { ListView } from "@/components/dashboard/ListView";
import { TaskModal, type TaskFormData } from "@/components/dashboard/TaskModal";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { PriorityFilter } from "@/components/dashboard/PriorityFilter";
import type { DashboardOutletContext } from "@/pages/dashboard/DashboardLayout";

export default function MyTasksPage() {
  const { t } = useTranslation();
  const { activeProject } = useOutletContext<DashboardOutletContext>();
  const { userId } = useAuth();
  const { data: tasks = [], isLoading, isError } = useTasks(activeProject?.id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);

  const hasAssignees = tasks.some((task) => task.assigneeUserId);
  const myTasks = useMemo(() => {
    const base =
      userId && hasAssignees ? tasks.filter((task) => task.assigneeUserId === userId) : tasks;
    return filterTasks(base, { search, priority: priorityFilter });
  }, [tasks, userId, hasAssignees, search, priorityFilter]);

  const openEditModal = (task: ApiTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleModalSubmit = (form: TaskFormData) => {
    const assigneeUserId = form.assignToMe && userId ? userId : null;

    if (editingTask) {
      updateTask.mutate(
        {
          id: editingTask.id,
          title: form.title.trim(),
          description: form.description || null,
          status: form.status,
          priority: form.priority || null,
          dueDate: form.dueDate || null,
          assigneeUserId,
        },
        { onSuccess: () => setModalOpen(false) },
      );
    } else if (activeProject) {
      createTask.mutate(
        {
          projectId: activeProject.id,
          title: form.title.trim(),
          description: form.description || undefined,
          status: form.status,
          priority: form.priority || undefined,
          dueDate: form.dueDate || undefined,
          assigneeUserId: userId ?? undefined,
        },
        { onSuccess: () => setModalOpen(false) },
      );
    }
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
          <p className="text-xs text-muted-foreground">{t("myTasks.subtitle")}</p>
          <h1 className="text-base font-semibold">{t("myTasks.title")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("projects.searchPlaceholder")}
              className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-2">
        <p className="text-sm text-muted-foreground">
          {!hasAssignees
            ? t("myTasks.allNote")
            : t("myTasks.assignedCount", { count: myTasks.length })}
        </p>
        <div className="flex items-center gap-2">
          <PriorityFilter value={priorityFilter} onChange={setPriorityFilter} />
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("projects.addTask")}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("myTasks.loading")}</p>
        ) : isError ? (
          <p className="text-sm text-red-600">{t("myTasks.loadError")}</p>
        ) : (
          <ListView tasks={myTasks} onEdit={openEditModal} onDelete={handleDelete} />
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        task={editingTask}
        isSubmitting={createTask.isPending || updateTask.isPending}
        currentUserId={userId ?? undefined}
      />
    </>
  );
}
