import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { requireClerkAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireClerkAuth);

router.get("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const projectId = req.query.projectId as string | undefined;

  try {
    const db = getDb();
    const rows = projectId
      ? await db.select().from(schema.tasks).where(eq(schema.tasks.projectId, projectId))
      : await db.select().from(schema.tasks);

    res.json(rows);
  } catch (err) {
    console.error("GET /tasks error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { projectId, title, description, status, priority, dueDate, assigneeUserId } = req.body as {
    projectId?: string;
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    assigneeUserId?: string;
  };

  if (!projectId || !title?.trim()) {
    return res.status(400).json({ error: "projectId and title are required" });
  }

  try {
    const db = getDb();
    const [task] = await db
      .insert(schema.tasks)
      .values({
        projectId,
        title: title.trim(),
        description: description ?? null,
        status: status ?? "todo",
        priority: priority ?? null,
        dueDate: dueDate ?? null,
        assigneeUserId: assigneeUserId ?? null,
        completedAt: status === "done" ? new Date() : null,
      })
      .returning();

    res.status(201).json(task);
  } catch (err) {
    console.error("POST /tasks error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.patch("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { title, description, status, priority, dueDate, assigneeUserId } = req.body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    assigneeUserId?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (dueDate !== undefined) updates.dueDate = dueDate;
  if (assigneeUserId !== undefined) updates.assigneeUserId = assigneeUserId;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const db = getDb();

    if (status !== undefined) {
      const [existing] = await db
        .select({ status: schema.tasks.status })
        .from(schema.tasks)
        .where(eq(schema.tasks.id, req.params.id))
        .limit(1);
      if (!existing) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (status === "done" && existing.status !== "done") {
        updates.completedAt = new Date();
      } else if (status !== "done" && existing.status === "done") {
        updates.completedAt = null;
      }
    }

    const [task] = await db
      .update(schema.tasks)
      .set(updates)
      .where(eq(schema.tasks.id, req.params.id))
      .returning();

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (err) {
    console.error("PATCH /tasks error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const [task] = await db
      .delete(schema.tasks)
      .where(eq(schema.tasks.id, req.params.id))
      .returning();

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("DELETE /tasks error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;
