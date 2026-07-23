import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { getClerkUserId, requireClerkAuth } from "../middleware/auth.js";
import {
  applyCompletedAtUpdate,
  canMutateDailyTask,
  getAssigneeIdsForTask,
  getTaskProjectContext,
  initialCompletedAtForStatus,
  loadAssigneesByTaskIds,
  parseDueDateInput,
  serializeTask,
  syncTaskAssignees,
} from "../lib/task-service.js";

const router = Router();

router.use(requireClerkAuth);

function canViewProjectContents(
  project: { isPersonal: boolean; isPrivate: boolean; createdByUserId: string | null },
  userId: string | null | undefined,
): boolean {
  if (project.isPersonal) return true;
  if (!project.isPrivate) return true;
  if (!project.createdByUserId) return true;
  return Boolean(userId && project.createdByUserId === userId);
}

async function enrichTasks(db: ReturnType<typeof getDb>, rows: (typeof schema.tasks.$inferSelect)[]) {
  const assigneeMap = await loadAssigneesByTaskIds(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((row) =>
    serializeTask(row, assigneeMap.get(row.id) ?? (row.assigneeUserId ? [row.assigneeUserId] : [])),
  );
}

router.get("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const projectId = req.query.projectId as string | undefined;
  const userId = getClerkUserId(req);

  try {
    const db = getDb();

    if (projectId) {
      const [project] = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, projectId))
        .limit(1);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (!canViewProjectContents(project, userId)) {
        return res.status(403).json({ error: "This project is private" });
      }
      const rows = await db.select().from(schema.tasks).where(eq(schema.tasks.projectId, projectId));
      return res.json(await enrichTasks(db, rows));
    }

    const allProjects = await db.select().from(schema.projects);
    const visibleProjectIds = new Set(
      allProjects.filter((p) => canViewProjectContents(p, userId)).map((p) => p.id),
    );
    const allTasks = await db.select().from(schema.tasks);
    const rows = allTasks.filter((task) => visibleProjectIds.has(task.projectId));
    res.json(await enrichTasks(db, rows));
  } catch (err) {
    console.error("GET /tasks error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const {
    projectId,
    title,
    description,
    status,
    priority,
    dueDate,
    assigneeUserId,
    assigneeUserIds,
  } = req.body as {
    projectId?: string;
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    assigneeUserId?: string | null;
    assigneeUserIds?: string[];
  };

  if (!projectId || !title?.trim()) {
    return res.status(400).json({ error: "projectId and title are required" });
  }

  const userId = getClerkUserId(req);
  const participantIds =
    assigneeUserIds !== undefined
      ? assigneeUserIds
      : assigneeUserId
        ? [assigneeUserId]
        : [];

  try {
    const db = getDb();
    const [project] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId))
      .limit(1);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (project.isPersonal && !canMutateDailyTask(userId, participantIds)) {
      return res.status(403).json({ error: "Cannot create task for another person's Daily tab" });
    }

    const nextStatus = status ?? "todo";
    const parsedDue = parseDueDateInput(dueDate);

    const [task] = await db
      .insert(schema.tasks)
      .values({
        projectId,
        title: title.trim(),
        description: description ?? null,
        status: nextStatus as typeof schema.tasks.$inferInsert.status,
        priority: (priority ?? null) as typeof schema.tasks.$inferInsert.priority,
        dueDate: parsedDue,
        assigneeUserId: participantIds[0] ?? null,
        completedAt: initialCompletedAtForStatus(nextStatus),
      })
      .returning();

    const ids = await syncTaskAssignees(db, task.id, participantIds);
    res.status(201).json(serializeTask(task, ids));
  } catch (err) {
    console.error("POST /tasks error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.patch("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const {
    title,
    description,
    status,
    priority,
    dueDate,
    assigneeUserId,
    assigneeUserIds,
  } = req.body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    assigneeUserId?: string | null;
    assigneeUserIds?: string[];
  };

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (dueDate !== undefined) updates.dueDate = parseDueDateInput(dueDate);

  const hasAssigneePatch = assigneeUserIds !== undefined || assigneeUserId !== undefined;

  if (
    Object.keys(updates).length === 0 &&
    !hasAssigneePatch
  ) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const userId = getClerkUserId(req);

  try {
    const db = getDb();
    const ctx = await getTaskProjectContext(db, req.params.id);
    if (!ctx) {
      return res.status(404).json({ error: "Task not found" });
    }

    const currentAssignees = await getAssigneeIdsForTask(db, req.params.id);
    if (ctx.project.isPersonal && !canMutateDailyTask(userId, currentAssignees)) {
      return res.status(403).json({ error: "You can only edit tasks on your own Daily tab" });
    }

    if (status !== undefined) {
      applyCompletedAtUpdate(updates, status, ctx.task.status);
    }

    let task = ctx.task;
    if (Object.keys(updates).length > 0) {
      const [updated] = await db
        .update(schema.tasks)
        .set(updates)
        .where(eq(schema.tasks.id, req.params.id))
        .returning();
      if (!updated) {
        return res.status(404).json({ error: "Task not found" });
      }
      task = updated;
    }

    let ids = currentAssignees;
    if (hasAssigneePatch) {
      const nextIds =
        assigneeUserIds !== undefined
          ? assigneeUserIds
          : assigneeUserId
            ? [assigneeUserId]
            : [];
      if (ctx.project.isPersonal && !canMutateDailyTask(userId, nextIds)) {
        return res.status(403).json({ error: "Cannot assign task outside your Daily permissions" });
      }
      ids = await syncTaskAssignees(db, req.params.id, nextIds);
      const [refreshed] = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, req.params.id))
        .limit(1);
      if (refreshed) task = refreshed;
    }

    res.json(serializeTask(task, ids));
  } catch (err) {
    console.error("PATCH /tasks error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const userId = getClerkUserId(req);

  try {
    const db = getDb();
    const ctx = await getTaskProjectContext(db, req.params.id);
    if (!ctx) {
      return res.status(404).json({ error: "Task not found" });
    }

    const assignees = await getAssigneeIdsForTask(db, req.params.id);
    if (ctx.project.isPersonal && !canMutateDailyTask(userId, assignees)) {
      return res.status(403).json({ error: "You can only delete tasks on your own Daily tab" });
    }

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
