import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { getClerkUserId, requireClerkAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireClerkAuth);

type GoalRow = typeof schema.goals.$inferSelect;

async function goalWithMeta(db: ReturnType<typeof getDb>, goal: GoalRow) {
  const links = await db
    .select()
    .from(schema.goalProjects)
    .where(eq(schema.goalProjects.goalId, goal.id));

  const projectIds = links.map((l) => l.projectId);
  let projects: { id: string; name: string }[] = [];
  let totalTasks = 0;
  let doneTasks = 0;

  if (projectIds.length > 0) {
    const projectRows = await db
      .select({ id: schema.projects.id, name: schema.projects.name })
      .from(schema.projects)
      .where(inArray(schema.projects.id, projectIds));
    projects = projectRows;

    const taskRows = await db
      .select({ status: schema.tasks.status })
      .from(schema.tasks)
      .where(inArray(schema.tasks.projectId, projectIds));

    totalTasks = taskRows.length;
    doneTasks = taskRows.filter((t) => t.status === "done").length;
  }

  const progressPercent =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return {
    ...goal,
    projectIds,
    projects,
    totalTasks,
    doneTasks,
    progressPercent,
  };
}

router.get("/", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const rows = await db.select().from(schema.goals);
    const enriched = await Promise.all(rows.map((g) => goalWithMeta(db, g)));
    enriched.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    res.json(enriched);
  } catch (err) {
    console.error("GET /goals error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { title, description, projectIds } = req.body as {
    title?: string;
    description?: string;
    projectIds?: string[];
  };

  if (!title?.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  try {
    const db = getDb();
    const userId = getClerkUserId(req);
    const ids = Array.isArray(projectIds)
      ? [...new Set(projectIds.filter((id) => typeof id === "string" && id))]
      : [];

    if (ids.length > 0) {
      const valid = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(inArray(schema.projects.id, ids));
      if (valid.length !== ids.length) {
        return res.status(400).json({ error: "One or more projects are invalid" });
      }
    }

    const [goal] = await db
      .insert(schema.goals)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        createdByUserId: userId ?? null,
      })
      .returning();

    if (ids.length > 0) {
      await db.insert(schema.goalProjects).values(
        ids.map((projectId) => ({ goalId: goal.id, projectId })),
      );
    }

    res.status(201).json(await goalWithMeta(db, goal));
  } catch (err) {
    console.error("POST /goals error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.patch("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { title, description, projectIds } = req.body as {
    title?: string;
    description?: string | null;
    projectIds?: string[];
  };

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.id, req.params.id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Goal not found" });
    }

    const updates: Partial<typeof schema.goals.$inferInsert> = {};
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ error: "title is required" });
      }
      updates.title = title.trim();
    }
    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    let goal = existing;
    if (Object.keys(updates).length > 0) {
      const [updated] = await db
        .update(schema.goals)
        .set(updates)
        .where(eq(schema.goals.id, req.params.id))
        .returning();
      goal = updated;
    }

    if (projectIds !== undefined) {
      const ids = Array.isArray(projectIds)
        ? [...new Set(projectIds.filter((id) => typeof id === "string" && id))]
        : [];

      if (ids.length > 0) {
        const valid = await db
          .select({ id: schema.projects.id })
          .from(schema.projects)
          .where(inArray(schema.projects.id, ids));
        if (valid.length !== ids.length) {
          return res.status(400).json({ error: "One or more projects are invalid" });
        }
      }

      await db.delete(schema.goalProjects).where(eq(schema.goalProjects.goalId, goal.id));
      if (ids.length > 0) {
        await db.insert(schema.goalProjects).values(
          ids.map((projectId) => ({ goalId: goal.id, projectId })),
        );
      }
    }

    res.json(await goalWithMeta(db, goal));
  } catch (err) {
    console.error("PATCH /goals error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const [deleted] = await db
      .delete(schema.goals)
      .where(eq(schema.goals.id, req.params.id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Goal not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("DELETE /goals error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;
