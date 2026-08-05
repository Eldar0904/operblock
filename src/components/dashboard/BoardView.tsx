import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ApiTask, TaskStatus } from "@/lib/mock-data";
import { useColumnConfig } from "@/i18n/use-labels";
import { TaskCard } from "@/components/dashboard/TaskCard";

interface BoardViewProps {
  tasks: ApiTask[];
  onDragStart: (taskId: string) => void;
  onDrop: (status: TaskStatus) => void;
  dropTarget: TaskStatus | null;
  setDropTarget: (status: TaskStatus | null) => void;
  onEdit: (task: ApiTask) => void;
  onDelete: (task: ApiTask) => void;
  onAddToColumn: (status: TaskStatus) => void;
}

export function BoardView({
  tasks,
  onDragStart,
  onDrop,
  dropTarget,
  setDropTarget,
  onEdit,
  onDelete,
  onAddToColumn,
}: BoardViewProps) {
  const { t } = useTranslation();
  const columnConfig = useColumnConfig();
  const columns = columnConfig.map((col) => ({
    ...col,
    // Existing review tasks stay visible in the in-progress lane after the
    // intermediate review column is removed from the workflow.
    tasks: tasks.filter((task) => task.status === col.id || (col.id === "in_progress" && task.status === "in_review")),
  }));

  return (
    <div className="grid h-full min-w-[980px] grid-cols-4 gap-4">
      {columns.map((column) => (
        <div key={column.id} className="flex min-w-0 flex-col">
          <div className="group mb-3 flex min-h-9 items-center justify-between rounded-md bg-muted/60 px-2.5 py-1.5 transition-colors hover:bg-muted">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-foreground">{column.title}</h2>
              <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground shadow-sm">
                {column.tasks.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onAddToColumn(column.id)}
              className="ml-2 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              title={t("projects.addTask")}
              aria-label={`${t("projects.addTask")}: ${column.title}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div
            className={cn(
              "flex-1 space-y-3 overflow-y-auto rounded-lg bg-muted/50 p-2 transition-colors",
              dropTarget === column.id && "bg-indigo-50 ring-2 ring-indigo-200",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(column.id);
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(column.id);
            }}
          >
            {column.tasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">{t("board.noTasks")}</p>
            ) : (
              column.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={onDragStart}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
