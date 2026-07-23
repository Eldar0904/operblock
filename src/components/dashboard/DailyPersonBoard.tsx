import { useEffect, useMemo, useState } from "react";
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
const ACTIVE_TAB_KEY = "operblock-daily-person-tab";

interface PersonTab {
  key: string;
  assigneeUserId: string | null;
  label: string;
}

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

function memberSortLabel(
  member: ApiMember,
  currentUserId?: string | null,
): string {
  if (member.id === currentUserId) return "";
  return (
    resolveAssignee(member.id, [member], currentUserId)?.label ??
    member.fullName ??
    member.email ??
    member.id
  );
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

  const tabs: PersonTab[] = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    const me = members.find((m) => m.id === currentUserId);
    const others = members
      .filter((m) => m.id !== currentUserId)
      .slice()
      .sort((a, b) =>
        memberSortLabel(a, currentUserId).localeCompare(
          memberSortLabel(b, currentUserId),
          undefined,
          { sensitivity: "base" },
        ),
      );

    const result: PersonTab[] = [
      { key: UNASSIGNED_KEY, assigneeUserId: null, label: t("daily.unassigned") },
    ];

    if (me) {
      result.push({
        key: me.id,
        assigneeUserId: me.id,
        label: t("tasks.assigneeMe"),
      });
    }

    for (const m of others) {
      result.push({
        key: m.id,
        assigneeUserId: m.id,
        label: resolveAssignee(m.id, members, currentUserId)?.label ?? m.id,
      });
    }

    const orphanIds = [
      ...new Set(
        tasks
          .map((task) => task.assigneeUserId)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
          .filter((id) => !memberIds.has(id)),
      ),
    ].sort();

    for (const id of orphanIds) {
      result.push({
        key: id,
        assigneeUserId: id,
        label:
          id === currentUserId
            ? t("tasks.assigneeMe")
            : resolveAssignee(id, members, currentUserId)?.label ?? id.slice(0, 8),
      });
    }

    return result;
  }, [members, tasks, currentUserId, t]);

  const defaultTabKey = useMemo(() => {
    if (currentUserId && tabs.some((tab) => tab.key === currentUserId)) {
      return currentUserId;
    }
    return UNASSIGNED_KEY;
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
      // ignore quota / private mode
    }
  };

  const activeTab =
    tabs.find((tab) => tab.key === activeTabKey) ??
    tabs.find((tab) => tab.key === defaultTabKey) ??
    tabs[0];

  const tasksForTab = (assigneeUserId: string | null) => {
    const columnTasks = tasks.filter((task) =>
      assigneeUserId === null ? !task.assigneeUserId : task.assigneeUserId === assigneeUserId,
    );
    const open = columnTasks.filter((task) => task.status !== "done");
    const done = columnTasks.filter((task) => task.status === "done");
    return { open, done, all: columnTasks };
  };

  const openCountForTab = (assigneeUserId: string | null) =>
    tasksForTab(assigneeUserId).open.length;

  const moveTargets = tabs;

  const renderCard = (task: ApiTask, done: boolean) => (
    <li
      key={task.id}
      className={cn(
        "rounded-md border border-border bg-background p-3 shadow-sm",
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
          <label className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="shrink-0">{t("daily.moveTo")}</span>
            <select
              value={task.assigneeUserId ?? UNASSIGNED_KEY}
              onChange={(e) => {
                const value = e.target.value;
                const next = value === UNASSIGNED_KEY ? null : value;
                if ((task.assigneeUserId ?? null) === next) return;
                onReassign(task, next);
              }}
              className="h-7 max-w-[180px] rounded border border-input bg-background px-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
              aria-label={t("daily.moveTo")}
            >
              {moveTargets.map((target) => (
                <option key={target.key} value={target.key}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>
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

  if (!activeTab) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t("daily.emptyChecklist")}</p>
      </div>
    );
  }

  const { open, done, all } = tasksForTab(activeTab.assigneeUserId);

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map((tab) => {
          const openCount = openCountForTab(tab.assigneeUserId);
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
              {tab.assigneeUserId ? (
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
                {openCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-muted/20">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {activeTab.assigneeUserId ? (
              <AssigneeAvatar
                userId={activeTab.assigneeUserId}
                members={members}
                currentUserId={currentUserId}
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{activeTab.label}</h2>
              <p className="text-[11px] text-muted-foreground">
                {open.length} {t("daily.openSection").toLowerCase()}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => onAddToColumn(activeTab.assigneeUserId)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("daily.addForPerson")}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-hidden">
          {all.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("board.noTasks")}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => onAddToColumn(activeTab.assigneeUserId)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("daily.addForPerson")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-2">
              <section className="space-y-2 lg:min-h-0 lg:overflow-y-auto">
                <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("daily.openSection")}
                  <span className="ml-1.5 font-normal normal-case">({open.length})</span>
                </p>
                {open.length > 0 ? (
                  <ul className="space-y-2">{open.map((task) => renderCard(task, false))}</ul>
                ) : (
                  <p className="px-1 py-6 text-sm text-muted-foreground">{t("common.none")}</p>
                )}
              </section>
              <section className="space-y-2 border-t border-border/60 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
                <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("daily.completedSection")}
                  <span className="ml-1.5 font-normal normal-case">({done.length})</span>
                </p>
                {done.length > 0 ? (
                  <ul className="space-y-2">{done.map((task) => renderCard(task, true))}</ul>
                ) : (
                  <p className="px-1 py-6 text-sm text-muted-foreground">{t("common.none")}</p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
