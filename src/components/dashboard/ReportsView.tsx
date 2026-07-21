import { CheckCircle2, Clock, Plus, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ReportSummary } from "@/lib/api";
import { formatTicketId } from "@/lib/task-utils";
import { usePeriodLabels, useReportFormatters } from "@/i18n/use-labels";
import { formatPeriodLabel, localizeThroughputBuckets } from "@/lib/report-i18n";
import type { ReportPeriod } from "@/lib/report-utils";
import { ThroughputChart } from "@/components/dashboard/ThroughputChart";

interface ReportsViewProps {
  data: ReportSummary;
  period: ReportPeriod;
  projectFilter?: string;
  projects: { id: string; name: string }[];
  onPeriodChange: (period: ReportPeriod) => void;
  onProjectChange: (projectId: string) => void;
}

export function ReportsView({
  data,
  period,
  projectFilter = "",
  projects,
  onPeriodChange,
  onProjectChange,
}: ReportsViewProps) {
  const { t } = useTranslation();
  const periodLabels = usePeriodLabels();
  const { formatDelta, formatDeltaPct, priorityLabel, assigneeLabel, formatCompletedDate } =
    useReportFormatters();
  const previousCompleted = data.completed - data.deltaCompleted;
  const periodLabel = formatPeriodLabel(period, data.period.start, data.period.end);
  const throughput = localizeThroughputBuckets(period, data.period.start, data.throughput);

  const velocitySub =
    period === "week"
      ? t("reports.avgPerDay")
      : period === "month"
        ? t("reports.avgPerWeek")
        : t("reports.totalInPeriod");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("reports.workCompleted")}</h2>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border bg-background p-0.5">
            {(Object.keys(periodLabels) as ReportPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  period === p
                    ? "bg-indigo-600 text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <select
            value={projectFilter}
            onChange={(e) => onProjectChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t("reports.allProjects")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CheckCircle2}
          label={t("reports.completed")}
          value={data.completed}
          sub={formatDelta(data.deltaCompleted)}
          color="text-green-600 bg-green-50"
        />
        <StatCard
          icon={Plus}
          label={t("reports.created")}
          value={data.created}
          sub={t("reports.newInPeriod")}
          color="text-indigo-600 bg-indigo-50"
        />
        <StatCard
          icon={TrendingUp}
          label={t("reports.velocityDaily")}
          value={data.velocityDaily ?? 0}
          sub={`${velocitySub} · ${t("reports.completedCount", { count: data.completedDaily ?? 0 })}`}
          color="text-violet-600 bg-violet-50"
        />
        <StatCard
          icon={TrendingUp}
          label={t("reports.velocityProjects")}
          value={data.velocityProjects ?? 0}
          sub={`${velocitySub} · ${t("reports.completedCount", { count: data.completedProjects ?? 0 })}`}
          color="text-sky-600 bg-sky-50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={Clock}
          label={t("reports.cycleTime")}
          value={`${data.avgCycleTimeDays}d`}
          sub={formatDeltaPct(data.completed, previousCompleted)}
          color="text-amber-600 bg-amber-50"
        />
        <StatCard
          icon={TrendingUp}
          label={t("reports.velocityMixed")}
          value={data.velocity}
          sub={t("reports.velocityMixedHint")}
          color="text-slate-600 bg-slate-50"
        />
      </div>

      <ThroughputChart data={throughput} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title={t("reports.byAssignee")} empty={t("reports.noAssigneeData")}>
          {data.byAssignee.map((row) => (
            <BreakdownRow
              key={row.userId}
              label={assigneeLabel(row.userId)}
              count={row.count}
              total={data.completed}
            />
          ))}
        </BreakdownCard>
        <BreakdownCard title={t("reports.byPriority")} empty={t("reports.noPriorityData")}>
          {data.byPriority.map((row) => (
            <BreakdownRow
              key={row.priority}
              label={priorityLabel(row.priority)}
              count={row.count}
              total={data.completed}
            />
          ))}
        </BreakdownCard>
      </div>

      {data.byProject.length > 0 && (
        <BreakdownCard title={t("reports.byProject")} empty={t("reports.noProjectData")}>
          {data.byProject.map((row) => (
            <BreakdownRow
              key={row.projectId}
              label={row.name}
              count={row.count}
              total={data.completed}
            />
          ))}
        </BreakdownCard>
      )}

      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">{t("reports.completedTasks")}</h3>
        </div>
        {data.completedTasks.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            {t("reports.noCompletedInPeriod", { label: periodLabel })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 py-2 font-medium">{t("reports.tableId")}</th>
                  <th className="px-5 py-2 font-medium">{t("reports.tableTitle")}</th>
                  <th className="px-5 py-2 font-medium">{t("reports.tablePriority")}</th>
                  <th className="px-5 py-2 font-medium">{t("reports.tableCompleted")}</th>
                </tr>
              </thead>
              <tbody>
                {data.completedTasks.map((task) => (
                  <tr key={task.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">
                      {formatTicketId(task.id)}
                    </td>
                    <td className="px-5 py-2.5 font-medium">{task.title}</td>
                    <td className="px-5 py-2.5">
                      {task.priority ? priorityLabel(task.priority) : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {formatCompletedDate(task.completedAt ?? undefined)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  const [textColor, bgColor] = color.split(" ");
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className={cn("mb-3 inline-flex rounded-md p-2", bgColor)}>
        <Icon className={cn("h-4 w-4", textColor)} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function BreakdownCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasContent = childArray.length > 0;

  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {!hasContent ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 truncate text-sm text-muted-foreground">{label}</span>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
          />
        </div>
      </div>
      <span className="w-8 text-right text-sm font-medium">{count}</span>
    </div>
  );
}
