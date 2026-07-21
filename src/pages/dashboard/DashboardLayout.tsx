import { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  List,
  Plus,
  Settings,
  Target,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useCreateProject, useDailyProject, useProjects } from "@/hooks/useProjects";
import type { ApiProject } from "@/lib/mock-data";

const ACTIVE_PROJECT_KEY = "operblock-active-project";

export default function DashboardLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  useDailyProject();
  const createProject = useCreateProject();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_PROJECT_KEY),
  );
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (projects.length === 0) {
      if (activeProjectId) {
        setActiveProjectId(null);
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
      return;
    }

    const stillExists = projects.some((p) => p.id === activeProjectId);
    if (!stillExists) {
      const nextId = projects[0].id;
      setActiveProjectId(nextId);
      localStorage.setItem(ACTIVE_PROJECT_KEY, nextId);
    }
  }, [projects, activeProjectId]);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const selectProject = (project: ApiProject) => {
    setActiveProjectId(project.id);
    localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    navigate("/dashboard/projects");
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createProject.mutate(
      { name },
      {
        onSuccess: (project) => {
          setNewName("");
          setCreating(false);
          setActiveProjectId(project.id);
          localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
          navigate("/dashboard/projects");
        },
      },
    );
  };

  const navItems = [
    { icon: LayoutDashboard, label: t("nav.dashboard"), to: "/dashboard" },
    { icon: CalendarDays, label: t("nav.daily"), to: "/dashboard/daily" },
    { icon: List, label: t("nav.myTasks"), to: "/dashboard/my-tasks" },
    { icon: Inbox, label: t("nav.inbox"), to: "/dashboard/inbox" },
    { icon: Target, label: t("nav.goals"), to: "/dashboard/goals" },
    { icon: BarChart3, label: t("nav.reports"), to: "/dashboard/reports" },
    { icon: FolderKanban, label: t("nav.projects"), to: "/dashboard/projects" },
  ];

  return (
    <div className="flex h-screen bg-[#F4F5F7]">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
              <LayoutGrid className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sidebar-foreground">{t("brand")}</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-indigo-50 font-medium text-indigo-700"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {to === "/dashboard/inbox" && (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  •
                </span>
              )}
            </NavLink>
          ))}

          <div className="pt-4">
            <div className="mb-1 flex items-center justify-between px-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("common.projects")}
              </p>
              <button
                type="button"
                onClick={() => setCreating((v) => !v)}
                className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                title={t("projects.createProject")}
                aria-label={t("projects.createProject")}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {creating && (
              <form onSubmit={handleCreateProject} className="mb-2 space-y-1.5 px-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("projects.newProjectPlaceholder")}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-1">
                  <button
                    type="submit"
                    disabled={createProject.isPending || !newName.trim()}
                    className="h-7 flex-1 rounded-md bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {t("projects.createProject")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
                    }}
                    className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-sidebar-accent"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            )}

            {isLoading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">{t("common.loading")}</p>
            ) : projects.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">{t("projects.noProjectTitle")}</p>
            ) : (
              <div className="space-y-0.5">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => selectProject(project)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                      activeProject?.id === project.id
                        ? "bg-indigo-50 font-medium text-indigo-700"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="space-y-2 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2 rounded-md px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-100 text-indigo-700">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium text-sidebar-foreground">{t("workspace")}</span>
          </div>
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-indigo-50 font-medium text-indigo-700"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )
            }
          >
            <Settings className="h-4 w-4" />
            {t("nav.settings")}
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet context={{ activeProject }} />
      </div>
    </div>
  );
}

export interface DashboardOutletContext {
  activeProject?: { id: string; name: string; isPersonal?: boolean };
}
