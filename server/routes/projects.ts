import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { getClerkUserId, requireClerkAuth } from "../middleware/auth.js";

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
    res.json(rows.filter((p) => p.status === "active"));
  } catch (err) {
    console.error("GET /projects error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.get("/all", async (_req, res) => {
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
    console.error("GET /projects/all error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { name, orgId, portfolioId } = req.body as {
    name?: string;
    orgId?: string;
    portfolioId?: string | null;
  };
  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const db = getDb();
    const resolvedOrgId = await ensureOrgId(db, orgId);
    const createdByUserId = getClerkUserId(req);

    let resolvedPortfolioId: string | null = null;
    if (portfolioId) {
      const [portfolio] = await db
        .select({ id: schema.portfolios.id })
        .from(schema.portfolios)
        .where(eq(schema.portfolios.id, portfolioId))
        .limit(1);
      if (!portfolio) {
        return res.status(400).json({ error: "Invalid portfolioId" });
      }
      resolvedPortfolioId = portfolio.id;
    }

    const [project] = await db
      .insert(schema.projects)
      .values({
        name: name.trim(),
        orgId: resolvedOrgId,
        isPersonal: false,
        createdByUserId: createdByUserId ?? null,
        portfolioId: resolvedPortfolioId,
      })
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

  const { name, portfolioId, status, isPrivate } = req.body as {
    name?: string;
    portfolioId?: string | null;
    status?: "active" | "paused" | "canceled";
    isPrivate?: boolean;
  };

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  if (
    name === undefined &&
    portfolioId === undefined &&
    status === undefined &&
    isPrivate === undefined
  ) {
    return res.status(400).json({ error: "name, portfolioId, status, or isPrivate is required" });
  }

  try {
    const db = getDb();

    const [existing] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, req.params.id), eq(schema.projects.isPersonal, false)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Project not found" });
    }

    const userId = getClerkUserId(req);
    if (
      existing.createdByUserId &&
      (!userId || existing.createdByUserId !== userId)
    ) {
      return res.status(403).json({ error: "Only the project creator can edit this project" });
    }

    const updates: {
      name?: string;
      portfolioId?: string | null;
      status?: "active" | "paused" | "canceled";
      statusChangedAt?: Date | null;
      isPrivate?: boolean;
    } = {};
    if (name !== undefined) {
      updates.name = name.trim();
    }
    if (portfolioId !== undefined) {
      if (portfolioId === null) {
        updates.portfolioId = null;
      } else {
        const [portfolio] = await db
          .select({ id: schema.portfolios.id })
          .from(schema.portfolios)
          .where(eq(schema.portfolios.id, portfolioId))
          .limit(1);
        if (!portfolio) {
          return res.status(400).json({ error: "Invalid portfolioId" });
        }
        updates.portfolioId = portfolio.id;
      }
    }
    if (status !== undefined) {
      updates.status = status;
      updates.statusChangedAt =
        status === "active" ? null : new Date();
    }
    if (isPrivate !== undefined) {
      updates.isPrivate = Boolean(isPrivate);
    }

    const [project] = await db
      .update(schema.projects)
      .set(updates)
      .where(eq(schema.projects.id, req.params.id))
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

    const userId = getClerkUserId(req);
    if (
      existing.createdByUserId &&
      (!userId || existing.createdByUserId !== userId)
    ) {
      return res.status(403).json({ error: "Only the project creator can delete this project" });
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
