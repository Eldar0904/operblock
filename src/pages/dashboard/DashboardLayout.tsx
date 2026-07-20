import {
  BarChart3,
  Building2,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  List,
  Settings,
  Target,
} from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/useProjects";

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { data: projects = [] } = useProjects();
  const activeProject = projects[0];

  const navItems = [
    { icon: LayoutDashboard, label: t("nav.dashboard"), to: "/dashboard" },
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

        <nav className="flex-1 space-y-0.5 p-3">
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
  activeProject?: { id: string; name: string };
}
