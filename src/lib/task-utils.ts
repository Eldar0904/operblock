import i18n from "@/i18n";
import type { ApiTask, Priority, TaskStatus } from "@/lib/mock-data";
import { COLUMN_CONFIG } from "@/lib/mock-data";
import { isTerminalTaskStatus } from "@/lib/task-status";
import { formatDueDateDisplay } from "@/components/dashboard/DateTimeField";

export function formatTicketId(id: string): string {
  const clean = id.replace(/-/g, "");
  if (clean.length >= 4 && /^[0-9a-f]+$/i.test(clean)) {
    return `OB-${clean.slice(-4).toUpperCase()}`;
  }
  return id;
}

export function statusLabel(status: TaskStatus): string {
  return i18n.t(`status.${status}`, { defaultValue: status });
}

export function parseDueDate(dueDate: string): Date | null {
  const iso = Date.parse(dueDate);
  if (!Number.isNaN(iso)) return new Date(iso);
  for (const year of [2026, 2025, 2027]) {
    const parsed = Date.parse(`${dueDate} ${year}`);
    if (!Number.isNaN(parsed)) return new Date(parsed);
  }
  return null;
}

export function formatTaskDueDate(dueDate: string | null | undefined): string {
  if (!dueDate) return "";
  return formatDueDateDisplay(dueDate, i18n.language);
}

export function isOverdue(task: ApiTask): boolean {
  if (!task.dueDate || isTerminalTaskStatus(task.status)) return false;
  const due = parseDueDate(task.dueDate);
  if (!due) return false;
  return due.getTime() < Date.now();
}

export function filterTasks(
  tasks: ApiTask[],
  options: {
    search?: string;
    priority?: Priority | "all";
    assigneeUserId?: string;
    status?: TaskStatus;
  },
): ApiTask[] {
  let result = tasks;

  if (options.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(q));
  }

  if (options.priority && options.priority !== "all") {
    result = result.filter((t) => t.priority === options.priority);
  }

  if (options.assigneeUserId) {
    result = result.filter((t) => t.assigneeUserId === options.assigneeUserId);
  }

  if (options.status) {
    result = result.filter((t) => t.status === options.status);
  }

  return result;
}

export function computeTaskStats(tasks: ApiTask[]) {
  const byStatus = COLUMN_CONFIG.map((col) => ({
    ...col,
    count: tasks.filter((t) => t.status === col.id).length,
  }));
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = tasks.filter(isOverdue).length;
  return { byStatus, total, done, completionPct, overdue };
}

export function groupByDueDate(tasks: ApiTask[]): Map<string, ApiTask[]> {
  const groups = new Map<string, ApiTask[]>();
  const sorted = [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    const da = parseDueDate(a.dueDate)?.getTime() ?? 0;
    const db = parseDueDate(b.dueDate)?.getTime() ?? 0;
    return da - db;
  });

  for (const task of sorted) {
    const key = task.dueDate ? formatTaskDueDate(task.dueDate) : i18n.t("tasks.noDueDate");
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }
  return groups;
}

export const AVATAR_COLORS = [
  "bg-orange-400",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-violet-400",
  "bg-pink-400",
  "bg-amber-400",
];

export function initialsFromUser(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

export function avatarColorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
