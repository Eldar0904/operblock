import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ReportSummary } from "@/lib/api";
import { formatTicketId } from "@/lib/task-utils";
import { usePeriodLabels, useReportFormatters } from "@/i18n/use-labels";
import { formatPeriodLabel } from "@/lib/report-i18n";
import type { ReportPeriod } from "@/lib/report-utils";

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
  const { priorityLabel, formatCompletedDate } =
    useReportFormatters();
  const periodLabel = formatPeriodLabel(period, data.period.start, data.period.end);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const buckets = useMemo(
    () => buildCompletionBuckets(period, data.period.start, data.period.end, data.completedTasks),
    [period, data.period.start, data.period.end, data.completedTasks],
  );
  const activeBucket = buckets.find((bucket) => bucket.key === selectedBucket);
  const selectedTasks = activeBucket
    ? data.completedTasks.filter((task) => activeBucket.taskIds.includes(task.id))
    : data.completedTasks;

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

      <CompletionBuckets
        buckets={buckets}
        selectedBucket={selectedBucket}
        onSelect={(key) => setSelectedBucket((current) => (current === key ? null : key))}
        onClear={() => setSelectedBucket(null)}
        total={data.completedTasks.length}
        t={t}
      />

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
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold">
            {t("reports.completedTasks")} <span className="text-muted-foreground">({selectedTasks.length})</span>
          </h3>
          {activeBucket && (
            <button type="button" onClick={() => setSelectedBucket(null)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("reports.clearBucket")}
            </button>
          )}
        </div>
        {selectedTasks.length === 0 ? (
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
                {selectedTasks.map((task) => (
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

interface CompletionBucket {
  key: string;
  label: string;
  count: number;
  taskIds: string[];
}

function CompletionBuckets({
  buckets,
  selectedBucket,
  onSelect,
  onClear,
  total,
  t,
}: {
  buckets: CompletionBucket[];
  selectedBucket: string | null;
  onSelect: (key: string) => void;
  onClear: () => void;
  total: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t("reports.completedByPeriod")}</h3>
          <p className="text-xs text-muted-foreground">{t("reports.completedCount", { count: total })}</p>
        </div>
        {selectedBucket && (
          <button type="button" onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">
            {t("reports.clearBucket")}
          </button>
        )}
      </div>
      <div className="flex h-44 items-end gap-2 border-b border-border">
        {buckets.map((bucket) => {
          const isSelected = bucket.key === selectedBucket;
          const height = bucket.count === 0 ? 4 : Math.max(10, (bucket.count / max) * 100);
          return (
            <button
              key={bucket.key}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${bucket.label}: ${bucket.count}`}
              onClick={() => onSelect(bucket.key)}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1 rounded-t px-1 pt-2 hover:bg-muted/50"
            >
              <span className="text-xs font-medium">{bucket.count}</span>
              <span className={cn("w-full rounded-t bg-indigo-500 transition-colors", isSelected && "bg-indigo-700")} style={{ height: `${height}%` }} />
              <span className="truncate text-[10px] text-muted-foreground">{bucket.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("reports.bucketHint")}</p>
    </section>
  );
}

function buildCompletionBuckets(
  period: ReportPeriod,
  startInput: string,
  endInput: string,
  tasks: ReportSummary["completedTasks"],
): CompletionBucket[] {
  const start = startOfDay(new Date(startInput));
  const end = startOfDay(new Date(endInput));
  const definitions: { key: string; label: string; matches: (date: Date) => boolean }[] = [];
  const inRange = (date: Date) => date >= start && date <= end;

  if (period === "week") {
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = dateKey(date);
      definitions.push({ key, label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }), matches: (value) => dateKey(value) === key });
    }
  } else if (period === "month") {
    for (let i = 0; i < 5; i += 1) {
      definitions.push({ key: `week-${i + 1}`, label: `W${i + 1}`, matches: (value) => inRange(value) && Math.floor((value.getDate() - 1) / 7) === i });
    }
  } else {
    const count = period === "quarter" ? 3 : 12;
    for (let i = 0; i < count; i += 1) {
      const date = new Date(start);
      date.setMonth(start.getMonth() + i);
      const year = date.getFullYear();
      const month = date.getMonth();
      definitions.push({ key: `${year}-${month}`, label: date.toLocaleDateString(undefined, { month: "short" }), matches: (value) => inRange(value) && value.getFullYear() === year && value.getMonth() === month });
    }
  }

  return definitions.map((definition) => {
    const taskIds = tasks.filter((task) => task.completedAt && definition.matches(new Date(task.completedAt))).map((task) => task.id);
    return { key: definition.key, label: definition.label, count: taskIds.length, taskIds };
  });
}

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
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
