import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { getClerkUserId, requireClerkAuth } from "../middleware/auth.js";

/** Nested under /api/tasks/:taskId/comments */
export const taskCommentsRouter = Router({ mergeParams: true });
taskCommentsRouter.use(requireClerkAuth);

taskCommentsRouter.get("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const taskId = req.params.taskId;
  if (!taskId) {
    return res.status(400).json({ error: "taskId is required" });
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.taskId, taskId))
      .orderBy(asc(schema.comments.createdAt));
    res.json(rows);
  } catch (err) {
    console.error("GET /tasks/:taskId/comments error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

taskCommentsRouter.post("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const taskId = req.params.taskId;
  const { content } = req.body as { content?: string };
  const userId = getClerkUserId(req);

  if (!taskId) {
    return res.status(400).json({ error: "taskId is required" });
  }
  if (!content?.trim()) {
    return res.status(400).json({ error: "content is required" });
  }
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const db = getDb();
    const [task] = await db
      .select({ id: schema.tasks.id })
      .from(schema.tasks)
      .where(eq(schema.tasks.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const [comment] = await db
      .insert(schema.comments)
      .values({
        taskId,
        userId,
        content: content.trim(),
      })
      .returning();

    res.status(201).json(comment);
  } catch (err) {
    console.error("POST /tasks/:taskId/comments error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

/** Mounted at /api/comments */
const commentsRouter = Router();
commentsRouter.use(requireClerkAuth);

commentsRouter.delete("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const userId = getClerkUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, req.params.id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Comment not found" });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db
      .delete(schema.comments)
      .where(and(eq(schema.comments.id, req.params.id), eq(schema.comments.userId, userId)));

    res.status(204).send();
  } catch (err) {
    console.error("DELETE /comments/:id error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default commentsRouter;
