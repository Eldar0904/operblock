import "dotenv/config";
import { getDb, isDbConfigured, schema } from "./index.js";

const SEED_TASKS = [
  { title: "Research competitor onboarding flows", status: "backlog" as const, priority: "low" as const, dueDate: "Aug 12" },
  { title: "Draft API documentation outline", status: "backlog" as const, priority: "medium" as const },
  { title: "Design landing page hero section", status: "todo" as const, priority: "high" as const, dueDate: "Jul 25" },
  { title: "Set up CI/CD pipeline", status: "todo" as const, priority: "medium" as const, dueDate: "Jul 28" },
  { title: "Write release notes template", status: "todo" as const, priority: "low" as const },
  { title: "Implement Kanban drag-and-drop", status: "in_progress" as const, priority: "high" as const, dueDate: "Jul 22" },
  { title: "User testing session prep", status: "in_progress" as const, priority: "medium" as const, dueDate: "Jul 24" },
  { title: "Security audit remediation plan", status: "in_review" as const, priority: "high" as const, dueDate: "Jul 20" },
  { title: "Project kickoff meeting", status: "done" as const, priority: "medium" as const },
  { title: "Define MVP scope", status: "done" as const, priority: "high" as const },
];

async function seed() {
  if (!isDbConfigured()) {
    console.error("DATABASE_URL is not set. Copy .env.example → .env first.");
    process.exit(1);
  }

  const db = getDb();

  const existingProjects = await db.select().from(schema.projects).limit(1);
  if (existingProjects.length > 0) {
    console.log("Database already has projects — skipping seed.");
    process.exit(0);
  }

  const [org] = await db
    .insert(schema.organizations)
    .values({ name: "Acme Inc." })
    .returning();

  const [project] = await db
    .insert(schema.projects)
    .values({ orgId: org.id, name: "Q3 Launch: Project Nova" })
    .returning();

  await db.insert(schema.tasks).values(
    SEED_TASKS.map((task) => ({
      projectId: project.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ?? null,
    })),
  );

  console.log(`Seeded organization "${org.name}", project "${project.name}", ${SEED_TASKS.length} tasks.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
