import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { getClerkUserId, requireClerkAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireClerkAuth);

async function ensureOrgId(db: ReturnType<typeof getDb>): Promise<string> {
  const [org] = await db.select().from(schema.organizations).limit(1);
  if (org) return org.id;

  const [createdOrg] = await db
    .insert(schema.organizations)
    .values({ name: "Default Organization" })
    .returning();
  return createdOrg.id;
}

function canManagePortfolio(
  createdByUserId: string | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!createdByUserId) return true;
  return Boolean(userId && createdByUserId === userId);
}

router.get("/", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const rows = await db.select().from(schema.portfolios);
    rows.sort((a, b) => a.name.localeCompare(b.name));
    res.json(rows);
  } catch (err) {
    console.error("GET /portfolios error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const db = getDb();
    const orgId = await ensureOrgId(db);
    const createdByUserId = getClerkUserId(req);

    const [portfolio] = await db
      .insert(schema.portfolios)
      .values({
        name: name.trim(),
        orgId,
        createdByUserId: createdByUserId ?? null,
      })
      .returning();

    res.status(201).json(portfolio);
  } catch (err) {
    console.error("POST /portfolios error:", err);
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
    const [existing] = await db
      .select()
      .from(schema.portfolios)
      .where(eq(schema.portfolios.id, req.params.id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    const userId = getClerkUserId(req);
    if (!canManagePortfolio(existing.createdByUserId, userId)) {
      return res.status(403).json({ error: "Only the portfolio creator can rename this portfolio" });
    }

    const [portfolio] = await db
      .update(schema.portfolios)
      .set({ name: name.trim() })
      .where(eq(schema.portfolios.id, req.params.id))
      .returning();

    res.json(portfolio);
  } catch (err) {
    console.error("PATCH /portfolios error:", err);
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
      .from(schema.portfolios)
      .where(eq(schema.portfolios.id, req.params.id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    const userId = getClerkUserId(req);
    if (!canManagePortfolio(existing.createdByUserId, userId)) {
      return res.status(403).json({ error: "Only the portfolio creator can delete this portfolio" });
    }

    await db.delete(schema.portfolios).where(eq(schema.portfolios.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /portfolios error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;
