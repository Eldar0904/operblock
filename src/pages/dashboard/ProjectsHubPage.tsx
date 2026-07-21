import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FolderKanban, Layers, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useToast } from "@/components/ui/toast";
import { useCreateProject, useProjects } from "@/hooks/useProjects";
import { usePortfolios } from "@/hooks/usePortfolios";
import { useAllTasks } from "@/hooks/useTasks";
import { computeTaskStats } from "@/lib/task-utils";

export default function ProjectsHubPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: portfolios = [] } = usePortfolios();
  const { data: tasks = [], isLoading: tasksLoading, isError } = useAllTasks();
  const createProject = useCreateProject();
  const [newProjectName, setNewProjectName] = useState("");

  const portfolioNameById = useMemo(
    () => Object.fromEntries(portfolios.map((p) => [p.id, p.name])),
    [portfolios],
  );

  const tasksByProject = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const list = map.get(task.projectId) ?? [];
      list.push(task);
      map.set(task.projectId, list);
    }
    return map;
  }, [tasks]);

  const cards = useMemo(
    () =>
      projects.map((project) => {
        const projectTasks = tasksByProject.get(project.id) ?? [];
        const stats = computeTaskStats(projectTasks);
        return {
          project,
          portfolioName: project.portfolioId
            ? portfolioNameById[project.portfolioId]
            : undefined,
          stats,
        };
      }),
    [projects, tasksByProject, portfolioNameById],
  );

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    createProject.mutate(
      { name },
      {
        onSuccess: (project) => {
          setNewProjectName("");
          localStorage.setItem("operblock-active-project", project.id);
          navigate(`/dashboard/projects/${project.id}`);
        },
        onError: () => showToast(t("tasks.somethingWrong"), "error"),
      },
    );
  };

  const loading = projectsLoading || tasksLoading;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("nav.projects")}</p>
          <h1 className="text-base font-semibold">{t("projects.hubTitle")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("projects.hubLoading")}</p>
        ) : isError ? (
          <p className="text-sm text-red-600">{t("projects.loadError")}</p>
        ) : cards.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16">
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
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {t("projects.hubSubtitle", { count: cards.length })}
              </p>
              <form onSubmit={handleCreateProject} className="flex gap-2">
                <input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder={t("projects.newProjectPlaceholder")}
                  className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-56"
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

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map(({ project, portfolioName, stats }) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    localStorage.setItem("operblock-active-project", project.id);
                    navigate(`/dashboard/projects/${project.id}`);
                  }}
                  className="rounded-lg border border-border bg-background p-5 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-foreground">{project.name}</h3>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {portfolioName ?? t("portfolios.ungrouped")}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <HubStat
                      icon={Layers}
                      label={t("overview.totalTasks")}
                      value={stats.total}
                    />
                    <HubStat
                      icon={CheckCircle2}
                      label={t("overview.completion")}
                      value={`${stats.completionPct}%`}
                    />
                    <HubStat
                      icon={AlertTriangle}
                      label={t("overview.overdue")}
                      value={stats.overdue}
                      warn={stats.overdue > 0}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function HubStat({
  icon: Icon,
  label,
  value,
  warn,
}: {
  icon: typeof Layers;
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/60 px-2 py-2">
      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className={`h-3 w-3 ${warn ? "text-red-500" : ""}`} />
        <span className="truncate">{label}</span>
      </div>
      <p className={`text-sm font-semibold ${warn ? "text-red-600" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
