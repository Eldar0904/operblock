import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { requireClerkAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireClerkAuth);

const DAILY_PROJECT_NAME = "Daily";

async function ensureOrgId(
  db: ReturnType<typeof getDb>,
  orgId?: string,
): Promise<string> {
  if (orgId) return orgId;

  const [org] = await db.select().from(schema.organizations).limit(1);
  if (org) return org.id;

  const [createdOrg] = await db
    .insert(schema.organizations)
    .values({ name: "Default Organization" })
    .returning();
  return createdOrg.id;
}

async function ensureDailyProject(db: ReturnType<typeof getDb>) {
  const [existing] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.isPersonal, true))
    .limit(1);

  if (existing) {
    if (existing.name !== DAILY_PROJECT_NAME) {
      const [updated] = await db
        .update(schema.projects)
        .set({ name: DAILY_PROJECT_NAME })
        .where(eq(schema.projects.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const resolvedOrgId = await ensureOrgId(db);
  const [created] = await db
    .insert(schema.projects)
    .values({
      name: DAILY_PROJECT_NAME,
      orgId: resolvedOrgId,
      isPersonal: true,
    })
    .returning();

  return created;
}

router.get("/daily", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const project = await ensureDailyProject(db);
    res.json(project);
  } catch (err) {
    console.error("GET /projects/daily error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

/** @deprecated alias — use /daily */
router.get("/personal", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const project = await ensureDailyProject(db);
    res.json(project);
  } catch (err) {
    console.error("GET /projects/personal error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.get("/", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.isPersonal, false));
    res.json(rows);
  } catch (err) {
    console.error("GET /projects error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { name, orgId } = req.body as { name?: string; orgId?: string };
  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const db = getDb();
    const resolvedOrgId = await ensureOrgId(db, orgId);

    const [project] = await db
      .insert(schema.projects)
      .values({ name: name.trim(), orgId: resolvedOrgId, isPersonal: false })
      .returning();

    res.status(201).json(project);
  } catch (err) {
    console.error("POST /projects error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.patch("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const db = getDb();
    const [project] = await db
      .update(schema.projects)
      .set({ name: name.trim() })
      .where(and(eq(schema.projects.id, req.params.id), eq(schema.projects.isPersonal, false)))
      .returning();

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    console.error("PATCH /projects error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, req.params.id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (existing.isPersonal) {
      return res.status(400).json({ error: "Cannot delete shared Daily board" });
    }

    const [project] = await db
      .delete(schema.projects)
      .where(eq(schema.projects.id, req.params.id))
      .returning();

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.status(204).send();
  } catch (err) {
    console.error("DELETE /projects error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;
