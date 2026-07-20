import { CheckCircle2, Clock, AlertTriangle, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ApiTask } from "@/lib/mock-data";
import { computeTaskStats } from "@/lib/task-utils";
import { useColumnConfig } from "@/i18n/use-labels";

interface OverviewViewProps {
  tasks: ApiTask[];
  title?: string;
}

export function OverviewView({ tasks, title }: OverviewViewProps) {
  const { t } = useTranslation();
  const columnConfig = useColumnConfig();
  const stats = computeTaskStats(tasks);
  const byStatus = columnConfig.map((col) => ({
    ...col,
    count: stats.byStatus.find((s) => s.id === col.id)?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{title ?? t("overview.projectTitle")}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Layers}
          label={t("overview.totalTasks")}
          value={stats.total}
          color="text-indigo-600 bg-indigo-50"
        />
        <StatCard
          icon={CheckCircle2}
          label={t("overview.completion")}
          value={`${stats.completionPct}%`}
          sub={t("overview.doneCount", { count: stats.done })}
          color="text-green-600 bg-green-50"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("overview.overdue")}
          value={stats.overdue}
          color="text-red-600 bg-red-50"
        />
        <StatCard
          icon={Clock}
          label={t("overview.inProgress")}
          value={byStatus.find((s) => s.id === "in_progress")?.count ?? 0}
          color="text-amber-600 bg-amber-50"
        />
      </div>

      <div className="rounded-lg border border-border bg-background p-5">
        <h3 className="mb-4 text-sm font-semibold">{t("overview.byStatus")}</h3>
        <div className="space-y-3">
          {byStatus.map((col) => (
            <div key={col.id} className="flex items-center gap-3">
              <span className="w-28 text-sm text-muted-foreground">{col.title}</span>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{
                      width: stats.total > 0 ? `${(col.count / stats.total) * 100}%` : "0%",
                    }}
                  />
                </div>
              </div>
              <span className="w-8 text-right text-sm font-medium">{col.count}</span>
            </div>
          ))}
        </div>
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
  icon: typeof Layers;
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
