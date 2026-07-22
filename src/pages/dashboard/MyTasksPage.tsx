import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  useAllTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/useTasks";
import { useDailyProject, useMembers, useProjects } from "@/hooks/useProjects";
import type { ApiTask, Priority } from "@/lib/mock-data";
import { filterTasks } from "@/lib/task-utils";
import { ListView } from "@/components/dashboard/ListView";
import { TaskModal, type TaskFormData } from "@/components/dashboard/TaskModal";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { PriorityFilter } from "@/components/dashboard/PriorityFilter";
import { useToast } from "@/components/ui/toast";

export default function MyTasksPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { userId } = useAuth();
  const { data: dailyProject, isLoading: dailyLoading } = useDailyProject();
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useMembers();
  const { data: tasks = [], isLoading, isError } = useAllTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);

  const projectNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const project of projects) {
      map[project.id] = project.name;
    }
    if (dailyProject) {
      map[dailyProject.id] = t("daily.title");
    }
    return map;
  }, [projects, dailyProject, t]);

  const myTasks = useMemo(() => {
    const assigned = userId
      ? tasks.filter((task) => task.assigneeUserId === userId)
      : [];
    return filterTasks(assigned, { search, priority: priorityFilter });
  }, [tasks, userId, search, priorityFilter]);

  const openEditModal = (task: ApiTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleModalSubmit = (form: TaskFormData) => {
    if (editingTask) {
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
    } else if (dailyProject) {
      createTask.mutate(
        {
          projectId: dailyProject.id,
          title: form.title.trim(),
          description: form.description || undefined,
          status: form.status,
          priority: form.priority || undefined,
          dueDate: form.dueDate || undefined,
          assigneeUserId: form.assigneeUserId ?? userId ?? undefined,
        },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      showToast(t("tasks.somethingWrong"), "error");
    }
  };

  const handleDelete = (task: ApiTask) => {
    if (window.confirm(t("projects.deleteConfirm", { title: task.title }))) {
      deleteTask.mutate(task.id);
    }
  };

  const loading = dailyLoading || isLoading;

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
          {t("myTasks.assignedCount", { count: myTasks.length })}
        </p>
        <div className="flex items-center gap-2">
          <PriorityFilter value={priorityFilter} onChange={setPriorityFilter} />
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!dailyProject}
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
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("myTasks.loading")}</p>
        ) : isError ? (
          <p className="text-sm text-red-600">{t("myTasks.loadError")}</p>
        ) : (
          <ListView
            tasks={myTasks}
            onEdit={openEditModal}
            onDelete={handleDelete}
            showProject
            hideAssignee
            projectNameById={projectNameById}
          />
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        task={editingTask}
        isSubmitting={createTask.isPending || updateTask.isPending}
        currentUserId={userId ?? undefined}
        members={members}
        defaultAssigneeToMe
      />
    </>
  );
}
