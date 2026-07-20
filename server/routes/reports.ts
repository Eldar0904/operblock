import { Router } from "express";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { requireClerkAuth } from "../middleware/auth.js";
import {
  buildThroughputBuckets,
  getPeriodRange,
  getPreviousPeriodRange,
  isInRange,
  parseAnchor,
  type ReportPeriod,
} from "../lib/report-utils.js";

const router = Router();

router.use(requireClerkAuth);

type TaskRow = typeof schema.tasks.$inferSelect;
type ProjectRow = typeof schema.projects.$inferSelect;

function toIso(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d instanceof Date ? d.toISOString() : String(d);
}

function serializeTask(task: TaskRow) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    assigneeUserId: task.assigneeUserId,
    createdAt: toIso(task.createdAt),
    completedAt: toIso(task.completedAt),
  };
}

function medianCycleDays(tasks: TaskRow[]): number {
  const days = tasks
    .filter((t) => t.completedAt && t.createdAt)
    .map((t) => {
      const created = new Date(t.createdAt).getTime();
      const completed = new Date(t.completedAt!).getTime();
      return (completed - created) / (1000 * 60 * 60 * 24);
    })
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);

  if (days.length === 0) return 0;
  const mid = Math.floor(days.length / 2);
  return days.length % 2 === 0
    ? Math.round(((days[mid - 1] + days[mid]) / 2) * 10) / 10
    : Math.round(days[mid] * 10) / 10;
}

router.get("/summary", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const period = (req.query.period as ReportPeriod) || "week";
  if (!["week", "month", "quarter", "year"].includes(period)) {
    return res.status(400).json({ error: "Invalid period" });
  }

  const anchor = parseAnchor(req.query.anchor as string | undefined);
  const projectId = req.query.projectId as string | undefined;

  const range = getPeriodRange(period, anchor);
  const previousRange = getPreviousPeriodRange(period, anchor);

  try {
    const db = getDb();

    const allTasks: TaskRow[] = projectId
      ? await db.select().from(schema.tasks).where(eq(schema.tasks.projectId, projectId))
      : await db.select().from(schema.tasks);

    const projects: ProjectRow[] = await db.select().from(schema.projects);
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    const completedInPeriod = allTasks.filter((t) => {
      if (!t.completedAt) return false;
      return isInRange(new Date(t.completedAt), range);
    });

    const completedInPrevious = allTasks.filter((t) => {
      if (!t.completedAt) return false;
      return isInRange(new Date(t.completedAt), previousRange);
    });

    const createdInPeriod = allTasks.filter((t) =>
      isInRange(new Date(t.createdAt), range),
    );

    const buckets = buildThroughputBuckets(period, range);
    for (const task of completedInPeriod) {
      const completed = new Date(task.completedAt!);
      for (const bucket of buckets) {
        if (completed >= bucket.start && completed <= bucket.end) {
          bucket.count++;
          break;
        }
      }
    }

    const byAssigneeMap = new Map<string, number>();
    for (const task of completedInPeriod) {
      const key = task.assigneeUserId ?? "unassigned";
      byAssigneeMap.set(key, (byAssigneeMap.get(key) ?? 0) + 1);
    }

    const byPriorityMap = new Map<string, number>();
    for (const task of completedInPeriod) {
      const key = task.priority ?? "none";
      byPriorityMap.set(key, (byPriorityMap.get(key) ?? 0) + 1);
    }

    const byProjectMap = new Map<string, number>();
    for (const task of completedInPeriod) {
      byProjectMap.set(task.projectId, (byProjectMap.get(task.projectId) ?? 0) + 1);
    }

    const velocity =
      period === "week"
        ? Math.round((completedInPeriod.length / 7) * 10) / 10
        : period === "month"
          ? Math.round((completedInPeriod.length / 4) * 10) / 10
          : completedInPeriod.length;

    res.json({
      period: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        label: range.label,
      },
      previousPeriod: {
        start: previousRange.start.toISOString(),
        end: previousRange.end.toISOString(),
        label: previousRange.label,
      },
      completed: completedInPeriod.length,
      created: createdInPeriod.length,
      deltaCompleted: completedInPeriod.length - completedInPrevious.length,
      avgCycleTimeDays: medianCycleDays(completedInPeriod),
      velocity,
      throughput: buckets.map(({ bucket, count }) => ({ bucket, count })),
      byAssignee: Array.from(byAssigneeMap.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count),
      byPriority: Array.from(byPriorityMap.entries())
        .map(([priority, count]) => ({ priority, count }))
        .sort((a, b) => b.count - a.count),
      byProject: Array.from(byProjectMap.entries())
        .map(([id, count]) => ({
          projectId: id,
          name: projectMap.get(id) ?? "Unknown",
          count,
        }))
        .sort((a, b) => b.count - a.count),
      completedTasks: completedInPeriod
        .sort(
          (a, b) =>
            new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
        )
        .map(serializeTask),
    });
  } catch (err) {
    console.error("GET /reports/summary error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

export default router;
