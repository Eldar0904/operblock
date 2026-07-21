import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { checkDbConnection } from "./db/index.js";
import { clerkAuth } from "./middleware/auth.js";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";
import reportsRouter from "./routes/reports.js";
import membersRouter from "./routes/members.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const clerkConfigured = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY,
);

app.use(
  cors({
    origin: process.env.APP_URL ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const db = await checkDbConnection();
  res.json({ ok: true, db, clerk: clerkConfigured, mode: isProduction ? "production" : "development" });
});

if (clerkConfigured) {
  app.use("/api/projects", clerkAuth, projectsRouter);
  app.use("/api/tasks", clerkAuth, tasksRouter);
  app.use("/api/reports", clerkAuth, reportsRouter);
  app.use("/api/members", clerkAuth, membersRouter);
} else {
  console.warn(
    "CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY not set — API auth disabled (dev only).",
  );
  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/members", membersRouter);
}

if (isProduction) {
  app.use(express.static(distPath));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
}

app.listen(PORT, () => {
  const url = process.env.APP_URL ?? `http://localhost:${PORT}`;
  console.log(`OperBlock API running on port ${PORT}${isProduction ? " (production)" : ""}`);
  if (isProduction) {
    console.log(`Serving frontend from ${distPath}`);
    console.log(`App URL: ${url}`);
  }
});
