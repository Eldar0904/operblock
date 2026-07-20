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
    tasks: tasks.filter((task) => task.status === col.id),
  }));

  return (
    <div className="flex h-full gap-4">
      {columns.map((column) => (
        <div key={column.id} className="flex w-72 shrink-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {column.tasks.length}
              </span>
            </div>
            <button
              onClick={() => onAddToColumn(column.id)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title={t("projects.addTask")}
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
