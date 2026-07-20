import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ApiTask } from "@/lib/mock-data";
import { formatTicketId, groupByDueDate, isOverdue, statusLabel } from "@/lib/task-utils";
import i18n from "@/i18n";

interface TimelineViewProps {
  tasks: ApiTask[];
  onEdit: (task: ApiTask) => void;
}

export function TimelineView({ tasks, onEdit }: TimelineViewProps) {
  const { t } = useTranslation();
  const groups = groupByDueDate(tasks);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t("timeline.noTasks")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([dueLabel, groupTasks]) => {
        const displayLabel =
          dueLabel === i18n.t("tasks.noDueDate") ? t("tasks.noDueDate") : dueLabel;

        return (
          <div key={dueLabel}>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold">{displayLabel}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {groupTasks.length}
              </span>
            </div>
            <div className="space-y-2 border-l-2 border-indigo-100 pl-4">
              {groupTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onEdit(task)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div>
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {formatTicketId(task.id)}
                    </span>
                    <span className="text-sm font-medium">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{statusLabel(task.status)}</span>
                    {isOverdue(task) && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                        {t("timeline.overdue")}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
