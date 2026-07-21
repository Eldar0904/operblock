import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Target,
  Trash2,
} from "lucide-react";
import { Link, NavLink, Outlet, useMatch, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  useCreateProject,
  useDailyProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/useProjects";
import {
  useCreatePortfolio,
  useDeletePortfolio,
  usePortfolios,
  useUpdatePortfolio,
} from "@/hooks/usePortfolios";
import { ApiError } from "@/lib/api";
import type { ApiPortfolio, ApiProject } from "@/lib/mock-data";
import { useToast } from "@/components/ui/toast";

const ACTIVE_PROJECT_KEY = "operblock-active-project";
const COLLAPSED_PORTFOLIOS_KEY = "operblock-collapsed-portfolios";

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { userId } = useAuth();
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: portfolios = [] } = usePortfolios();
  useDailyProject();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_PROJECT_KEY),
  );
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPortfolioId, setNewProjectPortfolioId] = useState<string>("");
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [renamingPortfolioId, setRenamingPortfolioId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_PORTFOLIOS_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const projectRouteMatch = useMatch("/dashboard/projects/:projectId");
  const routeProjectId = projectRouteMatch?.params.projectId ?? null;

  useEffect(() => {
    if (isLoading) return;

    if (projects.length === 0) {
      if (activeProjectId) {
        setActiveProjectId(null);
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
      return;
    }

    if (routeProjectId && projects.some((p) => p.id === routeProjectId)) {
      if (activeProjectId !== routeProjectId) {
        setActiveProjectId(routeProjectId);
        localStorage.setItem(ACTIVE_PROJECT_KEY, routeProjectId);
      }
      return;
    }

    if (activeProjectId && !projects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(null);
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }, [projects, activeProjectId, routeProjectId, isLoading]);

  const highlightedProjectId = routeProjectId ?? activeProjectId;
  const activeProject = projects.find((p) => p.id === highlightedProjectId);

  const portfolioIds = useMemo(() => new Set(portfolios.map((p) => p.id)), [portfolios]);

  const projectsByPortfolio = useMemo(() => {
    const map = new Map<string | null, ApiProject[]>();
    for (const portfolio of portfolios) {
      map.set(portfolio.id, []);
    }
    map.set(null, []);

    for (const project of projects) {
      const key =
        project.portfolioId && portfolioIds.has(project.portfolioId)
          ? project.portfolioId
          : null;
      const list = map.get(key) ?? [];
      list.push(project);
      map.set(key, list);
    }
    return map;
  }, [projects, portfolios, portfolioIds]);

  const ungrouped = projectsByPortfolio.get(null) ?? [];

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(COLLAPSED_PORTFOLIOS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const selectProject = (project: ApiProject) => {
    setActiveProjectId(project.id);
    localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
    setMenuProjectId(null);
    navigate(`/dashboard/projects/${project.id}`);
  };

  const canManagePortfolio = (portfolio: ApiPortfolio) =>
    portfolio.createdByUserId == null || portfolio.createdByUserId === userId;

  const openCreateProject = (portfolioId?: string | null) => {
    setCreatingPortfolio(false);
    setCreatingProject(true);
    setNewProjectPortfolioId(portfolioId ?? "");
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    createProject.mutate(
      {
        name,
        portfolioId: newProjectPortfolioId || null,
      },
      {
        onSuccess: (project) => {
          setNewProjectName("");
          setNewProjectPortfolioId("");
          setCreatingProject(false);
          setActiveProjectId(project.id);
          localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
          navigate(`/dashboard/projects/${project.id}`);
        },
        onError: () => showToast(t("tasks.somethingWrong"), "error"),
      },
    );
  };

  const handleCreatePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPortfolioName.trim();
    if (!name) return;
    createPortfolio.mutate(
      { name },
      {
        onSuccess: () => {
          setNewPortfolioName("");
          setCreatingPortfolio(false);
        },
        onError: () => showToast(t("tasks.somethingWrong"), "error"),
      },
    );
  };

  const handleRenamePortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingPortfolioId) return;
    const name = renameValue.trim();
    if (!name) return;
    updatePortfolio.mutate(
      { id: renamingPortfolioId, name },
      {
        onSuccess: () => {
          setRenamingPortfolioId(null);
          setRenameValue("");
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 403) {
            showToast(t("portfolios.renameForbidden"), "error");
            return;
          }
          showToast(t("tasks.somethingWrong"), "error");
        },
      },
    );
  };

  const handleDeletePortfolio = (portfolio: ApiPortfolio) => {
    if (!canManagePortfolio(portfolio)) {
      showToast(t("portfolios.deleteForbidden"), "error");
      return;
    }
    if (!window.confirm(t("portfolios.deleteConfirm", { name: portfolio.name }))) {
      return;
    }
    deletePortfolio.mutate(portfolio.id, {
      onError: (err) => {
        if (err instanceof ApiError && err.status === 403) {
          showToast(t("portfolios.deleteForbidden"), "error");
          return;
        }
        showToast(t("tasks.somethingWrong"), "error");
      },
    });
  };

  const handleMoveProject = (projectId: string, portfolioId: string | null) => {
    updateProject.mutate(
      { id: projectId, portfolioId },
      {
        onSuccess: () => setMenuProjectId(null),
        onError: () => showToast(t("tasks.somethingWrong"), "error"),
      },
    );
  };

  const dailyNav = [
    { icon: LayoutDashboard, label: t("nav.dashboard"), to: "/dashboard" },
    { icon: CalendarDays, label: t("nav.daily"), to: "/dashboard/daily" },
    { icon: List, label: t("nav.myTasks"), to: "/dashboard/my-tasks" },
  ];

  const longTermNav = [
    { icon: FolderKanban, label: t("nav.projects"), to: "/dashboard/projects" },
    { icon: Target, label: t("nav.goals"), to: "/dashboard/goals" },
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-indigo-50 font-medium text-indigo-700"
        : "text-sidebar-foreground hover:bg-sidebar-accent",
    );

  const renderProjectRow = (project: ApiProject) => (
    <div key={project.id} className="group relative">
      <button
        type="button"
        onClick={() => selectProject(project)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1.5 pl-3 pr-7 text-left text-sm transition-colors",
          highlightedProjectId === project.id
            ? "bg-indigo-50 font-medium text-indigo-700"
            : "text-sidebar-foreground hover:bg-sidebar-accent",
        )}
      >
        <FolderKanban className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{project.name}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuProjectId((id) => (id === project.id ? null : project.id));
        }}
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
          menuProjectId === project.id ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        title={t("portfolios.moveProject")}
        aria-label={t("portfolios.moveProject")}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {menuProjectId === project.id && (
        <div className="absolute right-0 z-20 mt-0.5 w-44 rounded-md border border-border bg-background p-1 shadow-md">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("portfolios.moveTo")}
          </p>
          <button
            type="button"
            onClick={() => handleMoveProject(project.id, null)}
            className={cn(
              "flex w-full rounded px-2 py-1.5 text-left text-xs hover:bg-sidebar-accent",
              !project.portfolioId && "font-medium text-indigo-700",
            )}
          >
            {t("portfolios.ungrouped")}
          </button>
          {portfolios.map((portfolio) => (
            <button
              key={portfolio.id}
              type="button"
              onClick={() => handleMoveProject(project.id, portfolio.id)}
              className={cn(
                "flex w-full rounded px-2 py-1.5 text-left text-xs hover:bg-sidebar-accent",
                project.portfolioId === portfolio.id && "font-medium text-indigo-700",
              )}
            >
              {portfolio.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderPortfolioSection = (portfolio: ApiPortfolio) => {
    const items = projectsByPortfolio.get(portfolio.id) ?? [];
    const isCollapsed = collapsed.has(portfolio.id);
    const isRenaming = renamingPortfolioId === portfolio.id;
    const manageable = canManagePortfolio(portfolio);

    return (
      <div key={portfolio.id} className="mb-1">
        <div className="group flex items-center gap-0.5 px-1">
          <button
            type="button"
            onClick={() => toggleCollapsed(portfolio.id)}
            className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            aria-label={isCollapsed ? t("portfolios.expand") : t("portfolios.collapse")}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {isRenaming ? (
            <form onSubmit={handleRenamePortfolio} className="flex flex-1 items-center gap-1">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="h-7 flex-1 rounded border border-input bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={updatePortfolio.isPending || !renameValue.trim()}
                className="h-7 rounded bg-indigo-600 px-1.5 text-[10px] font-medium text-white disabled:opacity-50"
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenamingPortfolioId(null);
                  setRenameValue("");
                }}
                className="h-7 rounded px-1 text-[10px] text-muted-foreground hover:bg-sidebar-accent"
              >
                {t("common.cancel")}
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => toggleCollapsed(portfolio.id)}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{portfolio.name}</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  ({items.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => openCreateProject(portfolio.id)}
                className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-sidebar-accent hover:text-foreground group-hover:opacity-100"
                title={t("projects.createProject")}
                aria-label={t("projects.createProject")}
              >
                <Plus className="h-3 w-3" />
              </button>
              {manageable && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingPortfolioId(portfolio.id);
                      setRenameValue(portfolio.name);
                    }}
                    className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-sidebar-accent hover:text-foreground group-hover:opacity-100"
                    title={t("portfolios.rename")}
                    aria-label={t("portfolios.rename")}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePortfolio(portfolio)}
                    className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    title={t("portfolios.delete")}
                    aria-label={t("portfolios.delete")}
                    disabled={deletePortfolio.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
        {!isCollapsed && <div className="ml-2 space-y-0.5">{items.map(renderProjectRow)}</div>}
      </div>
    );
  };

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
          {dailyNav.map(({ icon: Icon, label, to }) => (
            <NavLink key={to} to={to} end={to === "/dashboard"} className={navLinkClass}>
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
            </NavLink>
          ))}

          <div className="my-2 border-t border-sidebar-border" />

          {longTermNav.map(({ icon: Icon, label, to }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
            </NavLink>
          ))}

          <div className="pt-4">
            <div className="mb-1 flex items-center justify-between px-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("common.projects")}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingProject(false);
                    setCreatingPortfolio((v) => !v);
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  title={t("portfolios.add")}
                  aria-label={t("portfolios.add")}
                >
                  <Folder className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => openCreateProject()}
                  className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  title={t("projects.createProject")}
                  aria-label={t("projects.createProject")}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {creatingPortfolio && (
              <form onSubmit={handleCreatePortfolio} className="mb-2 space-y-1.5 px-1">
                <input
                  autoFocus
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder={t("portfolios.namePlaceholder")}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-1">
                  <button
                    type="submit"
                    disabled={createPortfolio.isPending || !newPortfolioName.trim()}
                    className="h-7 flex-1 rounded-md bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {t("portfolios.create")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingPortfolio(false);
                      setNewPortfolioName("");
                    }}
                    className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-sidebar-accent"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            )}

            {creatingProject && (
              <form onSubmit={handleCreateProject} className="mb-2 space-y-1.5 px-1">
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder={t("projects.newProjectPlaceholder")}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  value={newProjectPortfolioId}
                  onChange={(e) => setNewProjectPortfolioId(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t("portfolios.ungrouped")}</option>
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    type="submit"
                    disabled={createProject.isPending || !newProjectName.trim()}
                    className="h-7 flex-1 rounded-md bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {t("projects.createProject")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingProject(false);
                      setNewProjectName("");
                      setNewProjectPortfolioId("");
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
            ) : projects.length === 0 && portfolios.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">{t("projects.noProjectTitle")}</p>
            ) : (
              <div className="space-y-1">
                {portfolios.map(renderPortfolioSection)}

                {(ungrouped.length > 0 || portfolios.length > 0) && (
                  <div className="mb-1">
                    <div className="flex items-center gap-0.5 px-1">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed("__ungrouped")}
                        className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                      >
                        {collapsed.has("__ungrouped") ? (
                          <ChevronRight className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCollapsed("__ungrouped")}
                        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent"
                      >
                        <span className="truncate">{t("portfolios.ungrouped")}</span>
                        <span className="text-[10px] font-normal">({ungrouped.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openCreateProject(null)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                        title={t("projects.createProject")}
                        aria-label={t("projects.createProject")}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {!collapsed.has("__ungrouped") && (
                      <div className="ml-2 space-y-0.5">
                        {ungrouped.length === 0 ? (
                          <p className="px-3 py-1 text-[11px] text-muted-foreground">
                            {t("portfolios.ungroupedEmpty")}
                          </p>
                        ) : (
                          ungrouped.map(renderProjectRow)
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>

        <div className="space-y-2 border-t border-sidebar-border p-3">
          <NavLink to="/dashboard/reports" className={navLinkClass}>
            <BarChart3 className="h-4 w-4" />
            {t("nav.reports")}
          </NavLink>
          <div className="flex items-center gap-2 rounded-md px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-100 text-indigo-700">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium text-sidebar-foreground">{t("workspace")}</span>
          </div>
          <NavLink to="/dashboard/settings" className={navLinkClass}>
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
  activeProject?: ApiProject;
}
