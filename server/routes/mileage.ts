import { and, asc, eq, gte, lte } from "drizzle-orm";
import { Router } from "express";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { getClerkUserId, requireClerkAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireClerkAuth);

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

router.get("/mine", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const currentUserId = getClerkUserId(req);
  if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

  const { from, to } = req.query;
  try {
    const conditions = [eq(schema.mileageEntries.userId, currentUserId)];
    if (isDate(from)) conditions.push(gte(schema.mileageEntries.entryDate, from));
    if (isDate(to)) conditions.push(lte(schema.mileageEntries.entryDate, to));
    const entries = await getDb()
      .select()
      .from(schema.mileageEntries)
      .where(and(...conditions))
      .orderBy(asc(schema.mileageEntries.entryDate));
    res.json(entries);
  } catch (err) {
    console.error("GET /mileage error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.post("/mine", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const currentUserId = getClerkUserId(req);
  if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

  const { entryDate, kilometers, ratePerKm, note } = req.body as {
    entryDate?: unknown;
    kilometers?: unknown;
    ratePerKm?: unknown;
    note?: unknown;
  };
  if (!isDate(entryDate) || !Number.isInteger(kilometers) || !Number.isInteger(ratePerKm) || kilometers <= 0 || ratePerKm < 0) {
    return res.status(400).json({ error: "Date, kilometres and rate per kilometre are required" });
  }

  try {
    const [entry] = await getDb()
      .insert(schema.mileageEntries)
      .values({
        userId: currentUserId,
        entryDate,
        kilometers,
        ratePerKm,
        note: typeof note === "string" && note.trim() ? note.trim() : null,
      })
      .returning();
    res.status(201).json(entry);
  } catch (err) {
    console.error("POST /mileage error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

router.delete("/mine/:id", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const currentUserId = getClerkUserId(req);
  if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

  try {
    await getDb()
      .delete(schema.mileageEntries)
      .where(and(eq(schema.mileageEntries.id, req.params.id), eq(schema.mileageEntries.userId, currentUserId)));
    res.status(204).end();
  } catch (err) {
    console.error("DELETE /mileage error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;
