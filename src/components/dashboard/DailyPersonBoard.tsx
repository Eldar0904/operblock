import { Calendar, Check, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiMember } from "@/lib/api";
import type { ApiTask, Priority } from "@/lib/mock-data";
import { isOverdue } from "@/lib/task-utils";
import { usePriorityLabel } from "@/i18n/use-labels";
import { AssigneeAvatar, resolveAssignee } from "@/components/dashboard/AssigneeAvatar";

const priorityStyles: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const UNASSIGNED_KEY = "__unassigned__";

interface DailyPersonBoardProps {
  tasks: ApiTask[];
  members: ApiMember[];
  currentUserId?: string | null;
  onToggleDone: (task: ApiTask, done: boolean) => void;
  onReassign: (task: ApiTask, assigneeUserId: string | null) => void;
  onEdit: (task: ApiTask) => void;
  onDelete: (task: ApiTask) => void;
  onAddToColumn: (assigneeUserId: string | null) => void;
}

export function DailyPersonBoard({
  tasks,
  members,
  currentUserId,
  onToggleDone,
  onReassign,
  onEdit,
  onDelete,
  onAddToColumn,
}: DailyPersonBoardProps) {
  const { t } = useTranslation();
  const priorityLabel = usePriorityLabel();

  const memberIds = new Set(members.map((m) => m.id));
  const columns: { key: string; assigneeUserId: string | null; label: string }[] = [
    { key: UNASSIGNED_KEY, assigneeUserId: null, label: t("daily.unassigned") },
    ...members.map((m) => ({
      key: m.id,
      assigneeUserId: m.id,
      label:
        m.id === currentUserId
          ? t("tasks.assigneeMe")
          : resolveAssignee(m.id, members, currentUserId)?.label ?? m.id,
    })),
  ];

  // Orphan assignees (not in members list) get their own column
  const orphanIds = [
    ...new Set(
      tasks
        .map((task) => task.assigneeUserId)
        .filter((id): id is string => Boolean(id) && !memberIds.has(id)),
    ),
  ];
  for (const id of orphanIds) {
    columns.push({
      key: id,
      assigneeUserId: id,
      label:
        id === currentUserId
          ? t("tasks.assigneeMe")
          : resolveAssignee(id, members, currentUserId)?.label ?? id.slice(0, 8),
    });
  }

  const tasksForColumn = (assigneeUserId: string | null) => {
    const columnTasks = tasks.filter((task) =>
      assigneeUserId === null ? !task.assigneeUserId : task.assigneeUserId === assigneeUserId,
    );
    const open = columnTasks.filter((task) => task.status !== "done");
    const done = columnTasks.filter((task) => task.status === "done");
    return { open, done, all: columnTasks };
  };

  const renderCard = (task: ApiTask, done: boolean) => (
    <li
      key={task.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "cursor-grab rounded-md border border-border bg-background p-3 shadow-sm active:cursor-grabbing",
        done && "bg-muted/30 opacity-80",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onToggleDone(task, !done)}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
            done
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-input bg-background hover:border-indigo-400",
          )}
          title={done ? t("daily.markOpen") : t("daily.markDone")}
          aria-label={done ? t("daily.markOpen") : t("daily.markDone")}
        >
          {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              done && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {task.priority && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                  priorityStyles[task.priority],
                )}
              >
                {priorityLabel(task.priority)}
              </span>
            )}
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  isOverdue(task) && !done ? "font-medium text-red-600" : "text-muted-foreground",
                )}
              >
                <Calendar className="h-3 w-3" />
                {task.dueDate}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-600 hover:text-red-700"
            onClick={() => onDelete(task)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );

  if (tasks.length === 0 && members.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t("daily.emptyChecklist")}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[400px] gap-4 overflow-x-auto pb-2">
      {columns.map((column) => {
        const { open, done, all } = tasksForColumn(column.assigneeUserId);
        const isCurrentUser = column.assigneeUserId === currentUserId;

        return (
          <div
            key={column.key}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30",
              isCurrentUser && "ring-1 ring-indigo-200",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData("text/plain");
              const task = tasks.find((item) => item.id === taskId);
              if (!task) return;
              const nextAssignee = column.assigneeUserId;
              const current = task.assigneeUserId ?? null;
              if (current === nextAssignee) return;
              onReassign(task, nextAssignee);
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {column.assigneeUserId ? (
                  <AssigneeAvatar
                    userId={column.assigneeUserId}
                    members={members}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-foreground">{column.label}</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {open.length} {t("daily.openSection").toLowerCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddToColumn(column.assigneeUserId)}
                className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                title={t("daily.addForPerson")}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
              {all.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">{t("board.noTasks")}</p>
              ) : (
                <>
                  <ul className="space-y-2">{open.map((task) => renderCard(task, false))}</ul>
                  {done.length > 0 && (
                    <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
                      <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("daily.completedSection")}
                      </p>
                      <ul className="space-y-2">{done.map((task) => renderCard(task, true))}</ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
