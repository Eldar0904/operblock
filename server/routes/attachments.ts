import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import multer from "multer";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { getClerkUserId, requireClerkAuth } from "../middleware/auth.js";
import {
  canMutateDailyTask,
  getAssigneeIdsForTask,
  getTaskProjectContext,
} from "../lib/task-service.js";
import {
  buildStorageKey,
  deleteR2Object,
  getR2Object,
  isR2Configured,
  MAX_BYTES,
  putR2Object,
  validateAttachmentFile,
} from "../lib/r2.js";

function canViewProjectContents(
  project: { isPersonal: boolean; isPrivate: boolean; createdByUserId: string | null },
  userId: string | null | undefined,
): boolean {
  if (project.isPersonal) return true;
  if (!project.isPrivate) return true;
  if (!project.createdByUserId) return true;
  return Boolean(userId && project.createdByUserId === userId);
}

async function assertCanViewTask(taskId: string, userId: string | null | undefined) {
  const db = getDb();
  const ctx = await getTaskProjectContext(db, taskId);
  if (!ctx) return { error: "Task not found" as const, status: 404 as const };
  if (!canViewProjectContents(ctx.project, userId)) {
    return { error: "This project is private" as const, status: 403 as const };
  }
  return { ctx, db };
}

async function assertCanMutateTask(taskId: string, userId: string | null | undefined) {
  const result = await assertCanViewTask(taskId, userId);
  if ("error" in result) return result;
  const { ctx, db } = result;
  if (ctx.project.isPersonal) {
    const assignees = await getAssigneeIdsForTask(db, taskId);
    if (!canMutateDailyTask(userId, assignees)) {
      return { error: "You can only modify attachments on your own Daily tasks" as const, status: 403 as const };
    }
  }
  return { ctx, db };
}

function serializeAttachment(row: typeof schema.taskAttachments.$inferSelect) {
  return {
    id: row.id,
    taskId: row.taskId,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedByUserId: row.uploadedByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

/** Nested under /api/tasks/:taskId/attachments */
export const taskAttachmentsRouter = Router({ mergeParams: true });
taskAttachmentsRouter.use(requireClerkAuth);

taskAttachmentsRouter.get("/", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const taskId = req.params.taskId;
  if (!taskId) return res.status(400).json({ error: "taskId is required" });

  const userId = getClerkUserId(req);
  try {
    const access = await assertCanViewTask(taskId, userId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    const rows = await access.db
      .select()
      .from(schema.taskAttachments)
      .where(eq(schema.taskAttachments.taskId, taskId))
      .orderBy(asc(schema.taskAttachments.createdAt));

    res.json(rows.map(serializeAttachment));
  } catch (err) {
    console.error("GET /tasks/:taskId/attachments error:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

taskAttachmentsRouter.post("/", (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }
  if (!isR2Configured()) {
    return res.status(503).json({ error: "File storage is not configured" });
  }

  upload.single("file")(req, res, async (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "File must be 10 MB or smaller"
          : err.message || "Upload failed";
      return res.status(400).json({ error: message });
    }

    const taskId = req.params.taskId;
    const file = req.file;
    const userId = getClerkUserId(req);

    if (!taskId) return res.status(400).json({ error: "taskId is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!file) return res.status(400).json({ error: "file is required" });

    const validationError = validateAttachmentFile(file);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    try {
      const access = await assertCanMutateTask(taskId, userId);
      if ("error" in access) {
        return res.status(access.status).json({ error: access.error });
      }

      const storageKey = buildStorageKey(taskId, file.originalname);
      const contentType = file.mimetype || "application/octet-stream";

      await putR2Object({
        key: storageKey,
        body: file.buffer,
        contentType,
      });

      const [row] = await access.db
        .insert(schema.taskAttachments)
        .values({
          taskId,
          fileName: file.originalname.trim(),
          contentType,
          sizeBytes: file.size,
          storageKey,
          uploadedByUserId: userId,
        })
        .returning();

      res.status(201).json(serializeAttachment(row));
    } catch (uploadErr) {
      console.error("POST /tasks/:taskId/attachments error:", uploadErr);
      res.status(503).json({ error: "Upload failed" });
    }
  });
});

/** Top-level /api/attachments */
export const attachmentsRouter = Router();
attachmentsRouter.use(requireClerkAuth);

attachmentsRouter.get("/:id/download", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }
  if (!isR2Configured()) {
    return res.status(503).json({ error: "File storage is not configured" });
  }

  const userId = getClerkUserId(req);

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.taskAttachments)
      .where(eq(schema.taskAttachments.id, req.params.id))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const access = await assertCanViewTask(row.taskId, userId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    const object = await getR2Object(row.storageKey);
    const body = object.Body;
    if (!body || typeof body.transformToByteArray !== "function") {
      return res.status(404).json({ error: "File missing from storage" });
    }

    const bytes = await body.transformToByteArray();

    res.setHeader(
      "Content-Type",
      row.contentType || object.ContentType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(row.fileName)}`,
    );
    res.setHeader("Content-Length", String(bytes.byteLength));
    res.send(Buffer.from(bytes));
  } catch (err) {
    console.error("GET /attachments/:id/download error:", err);
    res.status(503).json({ error: "Download failed" });
  }
});

attachmentsRouter.delete("/:id", async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const userId = getClerkUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.taskAttachments)
      .where(eq(schema.taskAttachments.id, req.params.id))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const access = await assertCanMutateTask(row.taskId, userId);
    if ("error" in access) {
      return res.status(access.status).json({ error: access.error });
    }

    if (isR2Configured()) {
      try {
        await deleteR2Object(row.storageKey);
      } catch (r2Err) {
        console.error("R2 delete warning:", r2Err);
      }
    }

    await db.delete(schema.taskAttachments).where(eq(schema.taskAttachments.id, row.id));
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /attachments/:id error:", err);
    res.status(503).json({ error: "Delete failed" });
  }
});
