import { useMemo, useState } from "react";
import { FolderKanban, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams, useOutletContext, useLocation, useNavigate } from "react-router-dom";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
} from "@/hooks/useTasks";
import { useCreateProject, useDailyProject, useDeleteProject, useMembers } from "@/hooks/useProjects";
import type { ApiTask, Priority, TaskStatus } from "@/lib/mock-data";
import { filterTasks } from "@/lib/task-utils";
import { BoardView } from "@/components/dashboard/BoardView";
import { ListView } from "@/components/dashboard/ListView";
import { OverviewView } from "@/components/dashboard/OverviewView";
import { TimelineView } from "@/components/dashboard/TimelineView";
import { FilesView } from "@/components/dashboard/FilesView";
import { DailyPersonBoard } from "@/components/dashboard/DailyPersonBoard";
import { TaskModal, type TaskFormData } from "@/components/dashboard/TaskModal";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { MembersDropdown } from "@/components/dashboard/MembersDropdown";
import { PriorityFilter } from "@/components/dashboard/PriorityFilter";
import { useToast } from "@/components/ui/toast";
import type { DashboardOutletContext } from "@/pages/dashboard/DashboardLayout";

const VIEW_TAB_KEYS = ["overview", "list", "board", "timeline", "files"] as const;
type ViewTabKey = (typeof VIEW_TAB_KEYS)[number];

function paramToView(param: string | null): ViewTabKey {
  const match = VIEW_TAB_KEYS.find((v) => v === param?.toLowerCase());
  return match ?? "board";
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isDailyRoute = location.pathname.includes("/daily");
  const { activeProject: selectedProject } = useOutletContext<DashboardOutletContext>();
  const { data: dailyProject, isLoading: dailyLoading } = useDailyProject();
  const activeProject = isDailyRoute ? dailyProject : selectedProject;
  const { userId } = useAuth();
  const { data: members = [] } = useMembers();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = paramToView(searchParams.get("view"));

  const { data: tasks = [], isLoading, isFetching, isError } = useTasks(activeProject?.id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [defaultAssigneeUserId, setDefaultAssigneeUserId] = useState<string | null | undefined>(
    undefined,
  );
  const [newProjectName, setNewProjectName] = useState("");

  const filteredTasks = useMemo(
    () => filterTasks(tasks, { search, priority: priorityFilter }),
    [tasks, search, priorityFilter],
  );

  const setView = (view: ViewTabKey) => {
    setSearchParams({ view }, { replace: true });
  };

  const openAddModal = (status: TaskStatus = "todo", assigneeUserId?: string | null) => {
    if (!activeProject) {
      showToast(t("projects.needProjectFirst"), "error");
      return;
    }
    setEditingTask(null);
    setDefaultStatus(status);
    setDefaultAssigneeUserId(assigneeUserId);
    setModalOpen(true);
  };

  const openEditModal = (task: ApiTask) => {
    setEditingTask(task);
    setDefaultAssigneeUserId(undefined);
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
    } else if (activeProject) {
      createTask.mutate(
        {
          projectId: activeProject.id,
          title: form.title.trim(),
          description: form.description || undefined,
          status: form.status || defaultStatus,
          priority: form.priority || undefined,
          dueDate: form.dueDate || undefined,
          assigneeUserId: form.assigneeUserId ?? undefined,
        },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      showToast(t("projects.needProjectFirst"), "error");
    }
  };

  const handleDelete = (task: ApiTask) => {
    if (window.confirm(t("projects.deleteConfirm", { title: task.title }))) {
      deleteTask.mutate(task.id);
    }
  };

  const handleDeleteProject = () => {
    if (!activeProject || isDailyRoute) return;
    if (window.confirm(t("projects.deleteProjectConfirm", { name: activeProject.name }))) {
      deleteProject.mutate(activeProject.id);
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    createProject.mutate(
      { name },
      {
        onSuccess: (project) => {
          setNewProjectName("");
          navigate("/dashboard/projects");
          localStorage.setItem("operblock-active-project", project.id);
        },
        onError: () => showToast(t("tasks.somethingWrong"), "error"),
      },
    );
  };

  const handleDrop = (status: TaskStatus) => {
    if (!draggingTaskId) return;
    const task = tasks.find((t) => t.id === draggingTaskId);
    if (task && task.status !== status) {
      updateStatus.mutate({ id: draggingTaskId, status });
    }
    setDraggingTaskId(null);
    setDropTarget(null);
  };

  const handleToggleDone = (task: ApiTask, done: boolean) => {
    const nextStatus: TaskStatus = done ? "done" : "todo";
    if (task.status === nextStatus) return;
    updateStatus.mutate({ id: task.id, status: nextStatus });
  };

  const handleReassign = (task: ApiTask, assigneeUserId: string | null) => {
    if ((task.assigneeUserId ?? null) === assigneeUserId) return;
    updateTask.mutate({ id: task.id, assigneeUserId });
  };

  const handleAddToPersonColumn = (assigneeUserId: string | null) => {
    openAddModal("todo", assigneeUserId);
  };

  const isSubmitting = createTask.isPending || updateTask.isPending;
  const pageLoading = isDailyRoute ? dailyLoading || isLoading : isLoading;

  if (!isDailyRoute && !activeProject) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
          <div>
            <p className="text-xs text-muted-foreground">{t("nav.projects")}</p>
            <h1 className="text-base font-semibold">{t("projects.noProjectTitle")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsDropdown />
            <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold">{t("projects.noProjectTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("projects.noProjectDesc")}</p>
            <form onSubmit={handleCreateProject} className="mt-5 flex gap-2">
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t("projects.newProjectPlaceholder")}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={createProject.isPending || !newProjectName.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("projects.createProject")}
              </Button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const title = isDailyRoute ? t("daily.title") : activeProject?.name ?? t("projects.defaultName");
  const breadcrumb = isDailyRoute
    ? t("daily.subtitle")
    : t("projects.breadcrumb", { name: activeProject?.name ?? "" });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">{breadcrumb}</p>
          <h1 className="text-base font-semibold">
            {title}
            {isFetching && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">{t("common.syncing")}</span>
            )}
          </h1>
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

      <div className="flex items-center justify-between border-b border-border bg-background px-6">
        {!isDailyRoute ? (
          <div className="flex gap-1">
            {VIEW_TAB_KEYS.map((tab) => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={cn(
                  "border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  activeView === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`views.${tab}`)}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2 py-2">
          <PriorityFilter value={priorityFilter} onChange={setPriorityFilter} />
          <MembersDropdown />
          {!isDailyRoute && activeProject && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleDeleteProject}
              disabled={deleteProject.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("projects.deleteProject")}
            </Button>
          )}
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => openAddModal()}
            disabled={!activeProject}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("projects.addTask")}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {pageLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("projects.loadingTasks")}</p>
          </div>
        ) : isError ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-red-600">{t("projects.loadError")}</p>
          </div>
        ) : isDailyRoute ? (
          <DailyPersonBoard
            tasks={filteredTasks}
            members={members}
            currentUserId={userId}
            onToggleDone={handleToggleDone}
            onReassign={handleReassign}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onAddToColumn={handleAddToPersonColumn}
          />
        ) : activeView === "board" ? (
          <div className="h-full min-h-[400px] overflow-x-auto">
            <BoardView
              tasks={filteredTasks}
              onDragStart={setDraggingTaskId}
              onDrop={handleDrop}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onAddToColumn={openAddModal}
            />
          </div>
        ) : activeView === "list" ? (
          <ListView tasks={filteredTasks} onEdit={openEditModal} onDelete={handleDelete} />
        ) : activeView === "overview" ? (
          <OverviewView tasks={filteredTasks} title={t("overview.projectTitle")} />
        ) : activeView === "timeline" ? (
          <TimelineView tasks={filteredTasks} onEdit={openEditModal} />
        ) : (
          <FilesView />
        )}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        task={editingTask}
        defaultStatus={defaultStatus}
        isSubmitting={isSubmitting}
        currentUserId={userId ?? undefined}
        members={members}
        defaultAssigneeToMe={isDailyRoute && defaultAssigneeUserId === undefined}
        defaultAssigneeUserId={isDailyRoute ? defaultAssigneeUserId : undefined}
        hideStatus={isDailyRoute}
      />
    </>
  );
}
