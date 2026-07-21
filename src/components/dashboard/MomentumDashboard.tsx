import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ApiGoal } from "@/lib/api";
import type { ApiTask } from "@/lib/mock-data";
import type { ReportSummary } from "@/lib/api";
import {
  computeDailyHealth,
  computeProjectsHealth,
  splitTasksByDaily,
} from "@/lib/dashboard-stats";
import { useReportFormatters } from "@/i18n/use-labels";

interface MomentumDashboardProps {
  tasks: ApiTask[];
  dailyProjectId?: string;
  goals: ApiGoal[];
  weekReport?: ReportSummary;
  reportsLoading?: boolean;
}

export function MomentumDashboard({
  tasks,
  dailyProjectId,
  goals,
  weekReport,
  reportsLoading,
}: MomentumDashboardProps) {
  const { t } = useTranslation();
  const { formatDelta } = useReportFormatters();

  const dailyProjectIds = useMemo(
    () => new Set(dailyProjectId ? [dailyProjectId] : []),
    [dailyProjectId],
  );

  const { daily, projects } = useMemo(
    () => splitTasksByDaily(tasks, dailyProjectIds),
    [tasks, dailyProjectIds],
  );

  const dailyHealth = useMemo(() => computeDailyHealth(daily), [daily]);
  const projectsHealth = useMemo(() => computeProjectsHealth(projects), [projects]);

  const dailyWins = weekReport?.completedDaily ?? 0;
  const projectWins = weekReport?.completedProjects ?? 0;
  const totalWins = dailyWins + projectWins;
  const weekDelta = weekReport?.deltaCompleted;

  const topGoals = goals.slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-indigo-600">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {t("momentum.eyebrow")}
            </span>
          </div>
          <h2 className="text-lg font-semibold">{t("momentum.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("momentum.subtitle")}</p>
        </div>
        <Link
          to="/dashboard/reports"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {t("momentum.viewReports")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5">
        <h3 className="mb-4 text-sm font-semibold">{t("momentum.weekWins")}</h3>
        {reportsLoading ? (
          <p className="text-sm text-muted-foreground">{t("momentum.loadingWins")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <WinCard
              icon={CheckCircle2}
              label={t("momentum.totalClosed")}
              value={totalWins}
              sub={
                weekDelta !== undefined
                  ? formatDelta(weekDelta)
                  : t("momentum.thisWeek")
              }
              accent="text-emerald-600 bg-emerald-50"
            />
            <WinCard
              icon={CalendarDays}
              label={t("momentum.dailyWins")}
              value={dailyWins}
              sub={t("momentum.dailyWinsHint")}
              accent="text-violet-600 bg-violet-50"
            />
            <WinCard
              icon={TrendingUp}
              label={t("momentum.projectWins")}
              value={projectWins}
              sub={t("momentum.projectWinsHint")}
              accent="text-sky-600 bg-sky-50"
            />
          </div>
        )}
        {totalWins > 0 && !reportsLoading && (
          <p className="mt-4 text-sm text-muted-foreground">{t("momentum.encouragement")}</p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <HealthPanel
          title={t("momentum.dailyPanel")}
          description={t("momentum.dailyPanelDesc")}
          ctaLabel={t("momentum.openDaily")}
          ctaTo="/dashboard/daily"
          icon={CalendarDays}
          iconAccent="text-violet-600 bg-violet-50"
          metrics={[
            { label: t("momentum.open"), value: dailyHealth.open },
            { label: t("momentum.done"), value: dailyHealth.done },
            { label: t("momentum.unassigned"), value: dailyHealth.unassignedOpen },
            {
              label: t("momentum.overdue"),
              value: dailyHealth.overdue,
              warn: dailyHealth.overdue > 0,
            },
          ]}
        />
        <HealthPanel
          title={t("momentum.projectsPanel")}
          description={t("momentum.projectsPanelDesc")}
          ctaLabel={t("momentum.openProjects")}
          ctaTo="/dashboard/projects"
          icon={FolderKanban}
          iconAccent="text-sky-600 bg-sky-50"
          metrics={[
            { label: t("momentum.open"), value: projectsHealth.open },
            { label: t("momentum.inReview"), value: projectsHealth.inReview },
            {
              label: t("momentum.completion"),
              value: `${projectsHealth.completionPct}%`,
            },
            {
              label: t("momentum.overdue"),
              value: projectsHealth.overdue,
              warn: projectsHealth.overdue > 0,
            },
          ]}
        />
      </section>

      <section className="rounded-lg border border-border bg-background p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold">{t("momentum.goalsPulse")}</h3>
          </div>
          <Link
            to="/dashboard/goals"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            {t("momentum.allGoals")}
          </Link>
        </div>

        {topGoals.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("momentum.goalsEmpty")}</p>
            <Link
              to="/dashboard/goals"
              className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {t("momentum.addFirstGoal")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {topGoals.map((goal) => (
              <div key={goal.id} className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{goal.title}</p>
                  <span className="shrink-0 text-xs font-semibold text-indigo-600">
                    {goal.progressPercent}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${goal.progressPercent}%` }}
                  />
                </div>
                {goal.projects.length > 0 && (
                  <p className="mt-2 truncate text-[11px] text-muted-foreground">
                    {goal.projects.map((p) => p.name).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WinCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  sub: string;
  accent: string;
}) {
  const [textColor, bgColor] = accent.split(" ");
  return (
    <div className="rounded-lg border border-border/60 bg-background/80 p-4">
      <div className={cn("mb-3 inline-flex rounded-md p-2", bgColor)}>
        <Icon className={cn("h-4 w-4", textColor)} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function HealthPanel({
  title,
  description,
  ctaLabel,
  ctaTo,
  icon: Icon,
  iconAccent,
  metrics,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
  icon: typeof CalendarDays;
  iconAccent: string;
  metrics: { label: string; value: number | string; warn?: boolean }[];
}) {
  const [textColor, bgColor] = iconAccent.split(" ");
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-md p-2", bgColor)}>
            <Icon className={cn("h-4 w-4", textColor)} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Link
          to={ctaTo}
          className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {ctaLabel}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md bg-muted/40 px-3 py-2">
            <p
              className={cn(
                "text-lg font-semibold",
                metric.warn && "text-red-600",
              )}
            >
              {metric.value}
            </p>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
