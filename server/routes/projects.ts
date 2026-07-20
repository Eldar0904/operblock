import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { requireClerkAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireClerkAuth);

router.get("/", async (_req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  try {
    const db = getDb();
    const rows = await db.select().from(schema.projects);
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
    let resolvedOrgId = orgId;

    if (!resolvedOrgId) {
      const [org] = await db.select().from(schema.organizations).limit(1);
      if (org) {
        resolvedOrgId = org.id;
      } else {
        const [createdOrg] = await db
          .insert(schema.organizations)
          .values({ name: "Default Organization" })
          .returning();
        resolvedOrgId = createdOrg.id;
      }
    }

    const [project] = await db
      .insert(schema.projects)
      .values({ name: name.trim(), orgId: resolvedOrgId })
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
