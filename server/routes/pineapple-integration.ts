import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import {
  applyCompletedAtUpdate,
  getAssigneeIdsForTask,
  getTaskProjectContext,
  loadAssigneesByTaskIds,
  serializeTask,
} from "../lib/task-service.js";

const router = Router();

/** Statuses Pineapple's board can set. Matches the three columns in the PWA. */
const PINEAPPLE_STATUSES = new Set(["todo", "in_progress", "done"]);

function hasValidToken(value: string | undefined): boolean {
  const expected = process.env.PINEAPPLE_INTEGRATION_TOKEN;
  if (!expected || !value) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function requireIntegrationAuth(req: { header(name: string): string | undefined }, res: {
  status(code: number): { json(body: unknown): unknown };
}): boolean {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!hasValidToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * True only when the acting Clerk user is explicitly assigned.
 * Stricter than canMutateDailyTask: unassigned Daily tasks are not mutable via Pineapple.
 */
function canPineappleMutateTask(actingClerkUserId: string, assigneeIds: string[]): boolean {
  return assigneeIds.length > 0 && assigneeIds.includes(actingClerkUserId);
}

/**
 * Service-to-service export. Bypasses Clerk; Pineapple Sync uses PINEAPPLE_INTEGRATION_TOKEN.
 */
router.get("/daily-tasks", async (req, res) => {
  if (!requireIntegrationAuth(req, res)) return;
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const [dailyProject] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.isPersonal, true))
      .limit(1);

    if (!dailyProject) {
      return res.json({ project: null, tasks: [], exportedAt: new Date().toISOString() });
    }

    const rows = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.projectId, dailyProject.id));
    const assignees = await loadAssigneesByTaskIds(db, rows.map((task) => task.id));

    return res.json({
      project: { id: dailyProject.id, name: dailyProject.name },
      tasks: rows.map((task) => serializeTask(task, assignees.get(task.id) ?? [])),
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /integrations/pineapple/daily-tasks error:", error);
    return res.status(503).json({ error: "Database unavailable" });
  }
});

/**
 * Update a Daily task status on behalf of a Pineapple user.
 * Sync must pass actingClerkUserId after resolving users.clerk_user_id.
 */
router.patch("/daily-tasks/:taskId", async (req, res) => {
  if (!requireIntegrationAuth(req, res)) return;
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { actingClerkUserId, status } = req.body as {
    actingClerkUserId?: string;
    status?: string;
  };

  if (!actingClerkUserId || typeof actingClerkUserId !== "string") {
    return res.status(400).json({ error: "actingClerkUserId is required" });
  }
  if (!status || typeof status !== "string" || !PINEAPPLE_STATUSES.has(status)) {
    return res.status(400).json({
      error: "status must be one of: todo, in_progress, done",
    });
  }

  try {
    const db = getDb();
    const ctx = await getTaskProjectContext(db, req.params.taskId);
    if (!ctx) {
      return res.status(404).json({ error: "Task not found" });
    }
    if (!ctx.project.isPersonal) {
      return res.status(403).json({ error: "Only Daily tasks can be updated via Pineapple" });
    }

    const assignees = await getAssigneeIdsForTask(db, req.params.taskId);
    if (!canPineappleMutateTask(actingClerkUserId, assignees)) {
      return res.status(403).json({
        error: "You can only update OperBlock tasks assigned to you",
      });
    }

    const updates: Record<string, unknown> = { status };
    applyCompletedAtUpdate(updates, status, ctx.task.status);

    const [updated] = await db
      .update(schema.tasks)
      .set(updates)
      .where(eq(schema.tasks.id, req.params.taskId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.json(serializeTask(updated, assignees));
  } catch (error) {
    console.error("PATCH /integrations/pineapple/daily-tasks error:", error);
    return res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;
