import { useEffect, useMemo, useState } from "react";
import { Calendar, Layers, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiMember } from "@/lib/api";
import type { ApiTask, Priority } from "@/lib/mock-data";
import { formatTaskDueDate, isOverdue } from "@/lib/task-utils";
import { getTaskAssigneeIds, isDailyOpenStatus } from "@/lib/task-status";
import { usePriorityLabel } from "@/i18n/use-labels";
import { AssigneeAvatar, resolveAssignee } from "@/components/dashboard/AssigneeAvatar";

const GENERAL_KEY = "__general__";
const PAUSED_KEY = "__paused__";
const CANCELED_KEY = "__canceled__";
const ACTIVE_TAB_KEY = "operblock-daily-person-tab";

type TabKind = "general" | "person" | "paused" | "canceled";
type DropColumn = "open" | "done";

interface BoardTab {
  key: string;
  kind: TabKind;
  assigneeUserId: string | null;
  label: string;
}

interface DailyPersonBoardProps {
  tasks: ApiTask[];
  members: ApiMember[];
  currentUserId?: string | null;
  onToggleDone: (task: ApiTask, done: boolean) => void;
  onEdit: (task: ApiTask, readOnly?: boolean) => void;
  onDelete: (task: ApiTask) => void;
  onAddToColumn: (assigneeUserId: string | null) => void;
}

function memberSortLabel(member: ApiMember): string {
  return member.fullName ?? member.email ?? member.id;
}

function splitOpenDone(taskList: ApiTask[]) {
  const open = taskList.filter((task) => isDailyOpenStatus(task.status) && task.status !== "done");
  const done = taskList.filter((task) => task.status === "done");
  return { open, done, all: taskList };
}

export function DailyPersonBoard({
  tasks,
  members,
  currentUserId,
  onToggleDone,
  onEdit,
  onDelete,
  onAddToColumn,
}: DailyPersonBoardProps) {
  const { t } = useTranslation();
  const priorityLabel = usePriorityLabel();
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropColumn | null>(null);

  const tabs: BoardTab[] = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    const me = members.find((m) => m.id === currentUserId);
    const others = members
      .filter((m) => m.id !== currentUserId)
      .slice()
      .sort((a, b) => memberSortLabel(a).localeCompare(memberSortLabel(b), undefined, { sensitivity: "base" }));

    const result: BoardTab[] = [
      { key: GENERAL_KEY, kind: "general", assigneeUserId: null, label: t("daily.general") },
    ];

    if (me) {
      result.push({
        key: me.id,
        kind: "person",
        assigneeUserId: me.id,
        label: resolveAssignee(me.id, members, currentUserId)?.label ?? me.id,
      });
    }

    for (const m of others) {
      result.push({
        key: m.id,
        kind: "person",
        assigneeUserId: m.id,
        label: resolveAssignee(m.id, members, currentUserId)?.label ?? m.id,
      });
    }

    const orphanIds = [
      ...new Set(
        tasks.flatMap((task) => getTaskAssigneeIds(task)).filter((id) => !memberIds.has(id)),
      ),
    ].sort();

    for (const id of orphanIds) {
      result.push({
        key: id,
        kind: "person",
        assigneeUserId: id,
        label: resolveAssignee(id, members, currentUserId)?.label ?? id.slice(0, 8),
      });
    }

    result.push(
      { key: PAUSED_KEY, kind: "paused", assigneeUserId: null, label: t("daily.pausedTab") },
      { key: CANCELED_KEY, kind: "canceled", assigneeUserId: null, label: t("daily.canceledTab") },
    );

    return result;
  }, [members, tasks, currentUserId, t]);

  const defaultTabKey = useMemo(() => {
    if (currentUserId && tabs.some((tab) => tab.key === currentUserId)) {
      return currentUserId;
    }
    return GENERAL_KEY;
  }, [currentUserId, tabs]);

  const [activeTabKey, setActiveTabKey] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_TAB_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const keys = new Set(tabs.map((tab) => tab.key));
    if (activeTabKey && keys.has(activeTabKey)) return;
    setActiveTabKey(defaultTabKey);
  }, [tabs, activeTabKey, defaultTabKey]);

  const selectTab = (key: string) => {
    setActiveTabKey(key);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, key);
    } catch {
      // ignore
    }
  };

  const activeTab =
    tabs.find((tab) => tab.key === activeTabKey) ??
    tabs.find((tab) => tab.key === defaultTabKey) ??
    tabs[0];

  const canAddOnTab = (tab: BoardTab): boolean => {
    if (tab.kind === "paused" || tab.kind === "canceled") return false;
    if (tab.kind === "general") return true;
    return tab.assigneeUserId === currentUserId;
  };

  const canMutateTask = (task: ApiTask, tab: BoardTab): boolean => {
    if (!currentUserId) return false;
    const ids = getTaskAssigneeIds(task);
    if (tab.kind === "person") {
      return tab.assigneeUserId === currentUserId;
    }
    if (tab.kind === "general") {
      if (ids.length === 0) return true;
      if (ids.length >= 2) return ids.includes(currentUserId);
      return false;
    }
    if (tab.kind === "paused" || tab.kind === "canceled") {
      return ids.length === 0 || ids.includes(currentUserId);
    }
    return false;
  };

  const tasksForTab = (tab: BoardTab) => {
    if (tab.kind === "paused") {
      const list = tasks.filter((task) => task.status === "paused");
      return { ...splitOpenDone(list), inbox: [] as ApiTask[], collab: list };
    }
    if (tab.kind === "canceled") {
      const list = tasks.filter((task) => task.status === "canceled");
      return { ...splitOpenDone(list), inbox: [] as ApiTask[], collab: list };
    }
    if (tab.kind === "general") {
      const openTasks = tasks.filter(
        (task) => isDailyOpenStatus(task.status) && task.status !== "done",
      );
      const inbox = openTasks.filter((task) => getTaskAssigneeIds(task).length === 0);
      const collab = openTasks.filter((task) => getTaskAssigneeIds(task).length >= 2);
      const generalDone = tasks.filter((task) => {
        if (task.status !== "done") return false;
        const ids = getTaskAssigneeIds(task);
        return ids.length === 0 || ids.length >= 2;
      });
      return {
        open: [...inbox, ...collab],
        done: generalDone,
        all: [...inbox, ...collab],
        inbox,
        collab,
      };
    }
    const userId = tab.assigneeUserId!;
    const relevant = tasks.filter(
      (task) =>
        getTaskAssigneeIds(task).includes(userId) &&
        (task.status === "done" || isDailyOpenStatus(task.status)),
    );
    return { ...splitOpenDone(relevant), inbox: [] as ApiTask[], collab: [] as ApiTask[] };
  };

  const tabCount = (tab: BoardTab): number => {
    if (tab.kind === "paused") return tasks.filter((t) => t.status === "paused").length;
    if (tab.kind === "canceled") return tasks.filter((t) => t.status === "canceled").length;
    if (tab.kind === "general") {
      return tasks.filter(
        (task) => isDailyOpenStatus(task.status) && task.status !== "done",
      ).length;
    }
    const userId = tab.assigneeUserId!;
    return tasks.filter((task) => {
      const ids = getTaskAssigneeIds(task);
      return ids.includes(userId) && isDailyOpenStatus(task.status) && task.status !== "done";
    }).length;
  };

  const handleDropOnColumn = (column: DropColumn, tab: BoardTab) => {
    if (!draggingTaskId) return;
    const task = tasks.find((item) => item.id === draggingTaskId);
    setDraggingTaskId(null);
    setDropTarget(null);
    if (!task || !canMutateTask(task, tab)) return;

    const markDone = column === "done";
    const isDone = task.status === "done";
    if (markDone === isDone) return;
    onToggleDone(task, markDone);
  };

  const renderOccupants = (task: ApiTask) => {
    const ids = getTaskAssigneeIds(task);
    if (ids.length === 0) return null;
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {ids.map((id) => (
          <AssigneeAvatar key={id} userId={id} members={members} currentUserId={currentUserId} />
        ))}
      </div>
    );
  };

  const renderCard = (task: ApiTask, done: boolean, tab: BoardTab) => {
    const mutable = canMutateTask(task, tab);
    const canDrag = mutable && (tab.kind === "person" || tab.kind === "general");
    return (
      <li
        key={task.id}
        draggable={canDrag}
        onDragStart={() => {
          if (!canDrag) return;
          setDraggingTaskId(task.id);
        }}
        onDragEnd={() => {
          setDraggingTaskId(null);
          setDropTarget(null);
        }}
        className={cn(
          "rounded-md border border-border bg-background p-3 shadow-sm",
          done && "bg-muted/30 opacity-80",
          (tab.kind === "paused" || tab.kind === "canceled") && "opacity-90",
          canDrag && "cursor-grab active:cursor-grabbing",
          draggingTaskId === task.id && "opacity-60",
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-medium leading-snug",
                done && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </p>
            {(tab.kind === "paused" || tab.kind === "canceled" || (tab.kind === "general" && !done)) &&
              renderOccupants(task)}
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
                  {formatTaskDueDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task, !mutable)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {mutable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:text-red-700"
                onClick={() => onDelete(task)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </li>
    );
  };

  const renderDropColumn = (
    title: string,
    items: ApiTask[],
    column: DropColumn,
    tab: BoardTab,
  ) => (
    <section
      className={cn(
        "space-y-2 rounded-md p-1 transition-colors lg:min-h-0 lg:overflow-y-auto",
        dropTarget === column && draggingTaskId && "bg-indigo-50 ring-2 ring-indigo-200",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (draggingTaskId) setDropTarget(column);
      }}
      onDragLeave={() => setDropTarget(null)}
      onDrop={(e) => {
        e.preventDefault();
        handleDropOnColumn(column, tab);
      }}
    >
      <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="ml-1.5 font-normal normal-case">({items.length})</span>
      </p>
      {items.length > 0 ? (
        <ul className="space-y-2">{items.map((task) => renderCard(task, column === "done", tab))}</ul>
      ) : (
        <p className="px-1 py-6 text-sm text-muted-foreground">
          {draggingTaskId ? t("daily.dropToComplete") : t("common.none")}
        </p>
      )}
    </section>
  );

  const renderStaticColumn = (
    title: string,
    items: ApiTask[],
    tab: BoardTab,
    reopenDrop?: boolean,
  ) => (
    <section
      className={cn(
        "space-y-2 rounded-md p-1 transition-colors lg:min-h-0 lg:overflow-y-auto",
        reopenDrop && dropTarget === "open" && draggingTaskId && "bg-indigo-50 ring-2 ring-indigo-200",
      )}
      onDragOver={
        reopenDrop
          ? (e) => {
              e.preventDefault();
              if (draggingTaskId) setDropTarget("open");
            }
          : undefined
      }
      onDragLeave={reopenDrop ? () => setDropTarget(null) : undefined}
      onDrop={
        reopenDrop
          ? (e) => {
              e.preventDefault();
              handleDropOnColumn("open", tab);
            }
          : undefined
      }
    >
      <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="ml-1.5 font-normal normal-case">({items.length})</span>
      </p>
      {items.length > 0 ? (
        <ul className="space-y-2">{items.map((task) => renderCard(task, false, tab))}</ul>
      ) : (
        <p className="px-1 py-6 text-sm text-muted-foreground">{t("common.none")}</p>
      )}
    </section>
  );

  if (tasks.length === 0 && members.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t("daily.emptyChecklist")}</p>
      </div>
    );
  }

  if (!activeTab) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t("daily.emptyChecklist")}</p>
      </div>
    );
  }

  const tabData = tasksForTab(activeTab);
  const { open, done, all, inbox, collab } = tabData;
  const isGeneral = activeTab.kind === "general";
  const isTerminalTab = activeTab.kind === "paused" || activeTab.kind === "canceled";
  const canAdd = canAddOnTab(activeTab);
  const hasBoardContent =
    all.length > 0 ||
    (isGeneral && done.length > 0) ||
    (activeTab.kind === "person" && done.length > 0);

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map((tab) => {
          const count = tabCount(tab);
          const isActive = tab.key === activeTab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-indigo-600 font-medium text-indigo-700"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.kind === "general" ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                </div>
              ) : tab.kind === "person" && tab.assigneeUserId ? (
                <AssigneeAvatar
                  userId={tab.assigneeUserId}
                  members={members}
                  currentUserId={currentUserId}
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="max-w-[120px] truncate">{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  isActive ? "bg-indigo-100 text-indigo-700" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-muted/20">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{activeTab.label}</h2>
            <p className="text-[11px] text-muted-foreground">
              {isTerminalTab
                ? t("daily.closedTasks")
                : isGeneral
                  ? t("daily.dragHintGeneral")
                  : t("daily.dragHint")}
            </p>
          </div>
          {canAdd && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => onAddToColumn(activeTab.assigneeUserId)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("daily.addForPerson")}
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-hidden">
          {!hasBoardContent ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("board.noTasks")}</p>
              {canAdd && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => onAddToColumn(activeTab.assigneeUserId)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("daily.addForPerson")}
                </Button>
              )}
            </div>
          ) : isTerminalTab ? (
            <ul className="space-y-2">{all.map((task) => renderCard(task, false, activeTab))}</ul>
          ) : isGeneral ? (
            <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-3">
              {renderStaticColumn(t("daily.inboxSection"), inbox, activeTab, true)}
              {renderStaticColumn(t("daily.collaborationsSection"), collab, activeTab, true)}
              {renderDropColumn(t("daily.completedSection"), done, "done", activeTab)}
            </div>
          ) : (
            <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-2">
              {renderDropColumn(t("daily.openSection"), open, "open", activeTab)}
              {renderDropColumn(t("daily.completedSection"), done, "done", activeTab)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const priorityStyles: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};
