import { eq, inArray } from "drizzle-orm";
import type { getDb } from "../db/index.js";
import { schema } from "../db/index.js";
import { isTerminalTaskStatus, stampsCompletedAt } from "./task-status.js";

type Db = ReturnType<typeof getDb>;

export const MAX_TEAM_USERS = 6;

export interface TaskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  assigneeUserId: string | null;
  assigneeUserIds: string[];
  createdAt: string;
  completedAt: string | null;
}

export async function loadAssigneesByTaskIds(
  db: Db,
  taskIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (taskIds.length === 0) return map;

  const rows = await db
    .select()
    .from(schema.taskAssignees)
    .where(inArray(schema.taskAssignees.taskId, taskIds));

  for (const row of rows) {
    const list = map.get(row.taskId) ?? [];
    list.push(row.userId);
    map.set(row.taskId, list);
  }
  return map;
}

export function serializeTask(
  row: typeof schema.tasks.$inferSelect,
  assigneeUserIds: string[],
): TaskDto {
  const ids = assigneeUserIds.length
    ? assigneeUserIds
    : row.assigneeUserId
      ? [row.assigneeUserId]
      : [];

  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    assigneeUserId: ids[0] ?? null,
    assigneeUserIds: ids,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

export async function syncTaskAssignees(
  db: Db,
  taskId: string,
  userIds: string[],
): Promise<string[]> {
  const unique = [...new Set(userIds.filter(Boolean))];
  await db.delete(schema.taskAssignees).where(eq(schema.taskAssignees.taskId, taskId));
  if (unique.length > 0) {
    await db.insert(schema.taskAssignees).values(
      unique.map((userId) => ({ taskId, userId })),
    );
  }
  await db
    .update(schema.tasks)
    .set({ assigneeUserId: unique[0] ?? null })
    .where(eq(schema.tasks.id, taskId));
  return unique;
}

export async function getTaskProjectContext(db: Db, taskId: string) {
  const [row] = await db
    .select({
      task: schema.tasks,
      project: schema.projects,
    })
    .from(schema.tasks)
    .innerJoin(schema.projects, eq(schema.tasks.projectId, schema.projects.id))
    .where(eq(schema.tasks.id, taskId))
    .limit(1);
  return row ?? null;
}

export async function getAssigneeIdsForTask(db: Db, taskId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: schema.taskAssignees.userId })
    .from(schema.taskAssignees)
    .where(eq(schema.taskAssignees.taskId, taskId));
  if (rows.length > 0) return rows.map((r) => r.userId);
  const [task] = await db
    .select({ assigneeUserId: schema.tasks.assigneeUserId })
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId))
    .limit(1);
  return task?.assigneeUserId ? [task.assigneeUserId] : [];
}

export function canMutateDailyTask(
  userId: string | null | undefined,
  assigneeIds: string[],
): boolean {
  if (!userId) return false;
  if (assigneeIds.length === 0) return true;
  return assigneeIds.includes(userId);
}

export function applyCompletedAtUpdate(
  updates: Record<string, unknown>,
  nextStatus: string,
  prevStatus: string,
): void {
  const stamp = stampsCompletedAt(nextStatus, prevStatus);
  if (stamp !== undefined) {
    updates.completedAt = stamp;
  }
}

export function parseDueDateInput(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function initialCompletedAtForStatus(status: string): Date | null {
  return isTerminalTaskStatus(status) ? new Date() : null;
}
