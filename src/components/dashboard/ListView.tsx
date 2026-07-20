import { Calendar, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiTask, Priority } from "@/lib/mock-data";
import { formatTicketId, isOverdue, statusLabel } from "@/lib/task-utils";
import { usePriorityLabel } from "@/i18n/use-labels";

const priorityStyles: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

interface ListViewProps {
  tasks: ApiTask[];
  onEdit: (task: ApiTask) => void;
  onDelete: (task: ApiTask) => void;
}

export function ListView({ tasks, onEdit, onDelete }: ListViewProps) {
  const { t } = useTranslation();
  const priorityLabel = usePriorityLabel();

  if (tasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t("list.noFilters")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left">
            <th className="px-4 py-3 font-medium text-muted-foreground">{t("reports.tableId")}</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">{t("list.title")}</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">{t("list.status")}</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">{t("list.priority")}</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">{t("list.dueDate")}</th>
            <th className="px-4 py-3 font-medium text-muted-foreground">{t("list.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {formatTicketId(task.id)}
              </td>
              <td className="px-4 py-3 font-medium">{task.title}</td>
              <td className="px-4 py-3 text-muted-foreground">{statusLabel(task.status)}</td>
              <td className="px-4 py-3">
                {task.priority ? (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium",
                      priorityStyles[task.priority],
                    )}
                  >
                    {priorityLabel(task.priority)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {task.dueDate ? (
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      isOverdue(task) ? "font-medium text-red-600" : "text-muted-foreground",
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {task.dueDate}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(task)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
