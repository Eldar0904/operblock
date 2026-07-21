import { useEffect, useRef, useState } from "react";
import { Calendar, MessageSquare, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ApiTask, Priority } from "@/lib/mock-data";
import { formatTicketId, isOverdue } from "@/lib/task-utils";
import { usePriorityLabel } from "@/i18n/use-labels";
import { useMembers } from "@/hooks/useProjects";
import { AssigneeAvatar } from "@/components/dashboard/AssigneeAvatar";

const priorityStyles: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

interface TaskCardProps {
  task: ApiTask;
  onDragStart: (taskId: string) => void;
  onEdit: (task: ApiTask) => void;
  onDelete: (task: ApiTask) => void;
}

export function TaskCard({ task, onDragStart, onEdit, onDelete }: TaskCardProps) {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { data: members = [] } = useMembers();
  const priorityLabel = usePriorityLabel();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const showAssignee = Boolean(task.assigneeUserId || task.assignee);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      onClick={() => onEdit(task)}
      className="group cursor-grab rounded-lg border border-border bg-background p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          {formatTicketId(task.id)}
        </span>
        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 data-[open=true]:opacity-100"
            data-open={menuOpen}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-10 min-w-[120px] rounded-md border border-border bg-background py-1 shadow-lg">
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(task);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("common.edit")}
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(task);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("common.delete")}
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="mb-3 text-sm font-medium leading-snug text-foreground">{task.title}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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
                "flex items-center gap-1 text-[11px]",
                isOverdue(task) ? "font-medium text-red-600" : "text-muted-foreground",
              )}
            >
              <Calendar className="h-3 w-3" />
              {task.dueDate}
            </span>
          )}
          {task.comments !== undefined && task.comments > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {task.comments}
            </span>
          )}
        </div>
        {showAssignee &&
          (task.assigneeUserId ? (
            <AssigneeAvatar
              userId={task.assigneeUserId}
              members={members}
              currentUserId={userId}
            />
          ) : task.assignee ? (
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                task.assignee.color,
              )}
            >
              {task.assignee.initials}
            </div>
          ) : null)}
      </div>
    </div>
  );
}
