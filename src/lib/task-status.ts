export const TERMINAL_TASK_STATUSES = ["done", "paused", "canceled"] as const;

export type TerminalTaskStatus = (typeof TERMINAL_TASK_STATUSES)[number];

export function isTerminalTaskStatus(status: string): boolean {
  return (TERMINAL_TASK_STATUSES as readonly string[]).includes(status);
}

export function isDailyOpenStatus(status: string): boolean {
  return status !== "paused" && status !== "canceled";
}

export function getTaskAssigneeIds(task: {
  assigneeUserIds?: string[];
  assigneeUserId?: string | null;
}): string[] {
  if (task.assigneeUserIds && task.assigneeUserIds.length > 0) {
    return task.assigneeUserIds;
  }
  if (task.assigneeUserId) return [task.assigneeUserId];
  return [];
}
