import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { loadAssigneesByTaskIds, serializeTask } from "../lib/task-service.js";

const router = Router();

function hasValidToken(value: string | undefined): boolean {
  const expected = process.env.PINEAPPLE_INTEGRATION_TOKEN;
  if (!expected || !value) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

/**
 * Read-only service-to-service export. It deliberately bypasses Clerk because
 * Pineapple Sync authenticates with PINEAPPLE_INTEGRATION_TOKEN instead.
 */
router.get("/daily-tasks", async (req, res) => {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!hasValidToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
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

export default router;
