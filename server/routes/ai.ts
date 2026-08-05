import { Router } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "../db/index.js";
import { getClerkUserId, requireClerkAuth } from "../middleware/auth.js";
import {
  applyCompletedAtUpdate,
  canUpdateTask,
  canMutateDailyTask,
  getAssigneeIdsForTask,
  getTaskProjectContext,
  initialCompletedAtForStatus,
  parseDueDateInput,
  syncTaskAssignees,
} from "../lib/task-service.js";
import { fetchMembers } from "./members.js";

const router = Router();
router.use(requireClerkAuth);

const TASK_STATUSES = new Set(["backlog", "todo", "in_progress", "in_review", "done", "paused", "canceled"]);
const PRIORITIES = new Set(["low", "medium", "high"]);
const PROJECT_STATUSES = new Set(["active", "paused", "canceled"]);
const ACTION_TYPES = new Set(["create_project", "update_project", "delete_project", "create_task", "update_task", "delete_task"]);

type OperoAction = {
  type: "create_project" | "update_project" | "delete_project" | "create_task" | "update_task" | "delete_task";
  label: string;
  data: Record<string, unknown>;
  status?: "pending" | "completed" | "failed";
};

function userIdFor(req: Parameters<typeof getClerkUserId>[0]) {
  return getClerkUserId(req) ?? "development-user";
}

function canViewProject(project: typeof schema.projects.$inferSelect, userId: string) {
  return !project.isPrivate || project.createdByUserId === userId;
}

function canEditProject(project: typeof schema.projects.$inferSelect, userId: string) {
  return !project.isPersonal && project.createdByUserId === userId;
}

async function ownedConversation(db: ReturnType<typeof getDb>, id: string, userId: string) {
  const [conversation] = await db
    .select()
    .from(schema.aiConversations)
    .where(and(eq(schema.aiConversations.id, id), eq(schema.aiConversations.userId, userId)))
    .limit(1);
  return conversation ?? null;
}

async function workspaceContext(db: ReturnType<typeof getDb>, userId: string) {
  const projects = await db.select().from(schema.projects);
  const visibleProjects = projects.filter((project) => canViewProject(project, userId)).slice(0, 100);
  const visibleIds = visibleProjects.map((project) => project.id);
  const tasks = visibleIds.length
    ? await db.select().from(schema.tasks).where(inArray(schema.tasks.projectId, visibleIds))
    : [];
  const assignees = tasks.length
    ? await db.select().from(schema.taskAssignees).where(inArray(schema.taskAssignees.taskId, tasks.map((task) => task.id)))
    : [];
  const assigneesByTask = new Map<string, string[]>();
  for (const row of assignees) assigneesByTask.set(row.taskId, [...(assigneesByTask.get(row.taskId) ?? []), row.userId]);
  const members = process.env.CLERK_SECRET_KEY
    ? await fetchMembers().catch((error) => {
        console.error("Opero could not load team members", error);
        return [];
      })
    : [];

  return {
    members: members.map((member) => ({ id: member.id, name: member.fullName, email: member.email })),
    projects: visibleProjects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      private: project.isPrivate,
      editable: canEditProject(project, userId),
      canCreateTasks: true,
      isDaily: project.isPersonal,
    })),
    tasks: tasks.slice(0, 500).map((task) => ({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() ?? null,
      assigneeUserIds: assigneesByTask.get(task.id) ?? (task.assigneeUserId ? [task.assigneeUserId] : []),
      createdByUserId: task.createdByUserId,
      editable: canUpdateTask(
        userId,
        task,
        project,
        assigneesByTask.get(task.id) ?? (task.assigneeUserId ? [task.assigneeUserId] : []),
      ),
    })),
  };
}

const SYSTEM_PROMPT = `You are Opero, OperBlock's project-management assistant.
You receive the user's authorized workspace snapshot. Answer using that data and mention project/task names precisely.
You may propose actions. The application may automatically execute non-destructive actions when the user enables that setting; deletions always require confirmation.
For project update/delete actions, require that project's editable field to be true.
For task update/delete actions, require that task's editable field to be true.
Task creation is a separate permission: it is allowed whenever the target project's canCreateTasks field is true, even if that project has editable:false. In particular, the shared Daily project cannot itself be edited, but the user can create their own tasks inside it.
Return ONLY valid JSON with this shape: {"reply":"helpful response","actions":[]}.
Allowed action types: create_project, update_project, delete_project, create_task, update_task, delete_task.
Each action is {"type":"...","label":"clear human summary","data":{...}}.
Use exact IDs from the snapshot for existing records. create_project data: name. update_project data: id and any of name,status,isPrivate. delete_project data: id. create_task data: projectId,title and optional description,status,priority,dueDate,assigneeUserIds. update_task data: id and changed fields. delete_task data: id.
Only propose actions when the user explicitly asks to create, edit, assign, move, complete, pause, cancel, or delete something. Never invent IDs.`;

function parseModelResponse(content: string): { reply: string; actions: OperoAction[] } {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(cleaned) as { reply?: unknown; actions?: unknown };
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions.filter((action): action is OperoAction => {
          if (!action || typeof action !== "object") return false;
          const value = action as Partial<OperoAction>;
          return typeof value.type === "string" && ACTION_TYPES.has(value.type) && typeof value.label === "string" && Boolean(value.data) && typeof value.data === "object";
        }).slice(0, 10)
      : [];
    return { reply: typeof parsed.reply === "string" ? parsed.reply : content, actions };
  } catch {
    return { reply: content, actions: [] };
  }
}

router.get("/conversations", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const db = getDb();
  const rows = await db.select().from(schema.aiConversations)
    .where(eq(schema.aiConversations.userId, userIdFor(req)))
    .orderBy(desc(schema.aiConversations.updatedAt)).limit(30);
  res.json(rows);
});

router.post("/conversations", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const [row] = await getDb().insert(schema.aiConversations).values({ userId: userIdFor(req) }).returning();
  res.status(201).json(row);
});

router.delete("/conversations/:id", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const db = getDb();
  const conversation = await ownedConversation(db, req.params.id, userIdFor(req));
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  await db.delete(schema.aiConversations).where(eq(schema.aiConversations.id, conversation.id));
  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const db = getDb();
  if (!(await ownedConversation(db, req.params.id, userIdFor(req)))) return res.status(404).json({ error: "Conversation not found" });
  const rows = await db.select().from(schema.aiMessages)
    .where(eq(schema.aiMessages.conversationId, req.params.id)).orderBy(schema.aiMessages.createdAt);
  res.json(rows);
});

router.post("/conversations/:id/messages", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const content = typeof req.body?.content === "string" ? req.body.content.trim().slice(0, 8_000) : "";
  const language = req.body?.language === "kk" ? "Kazakh" : req.body?.language === "en" ? "English" : "Russian";
  if (!content) return res.status(400).json({ error: "Message is required" });

  const db = getDb();
  const userId = userIdFor(req);
  const conversation = await ownedConversation(db, req.params.id, userId);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const [userMessage] = await db.insert(schema.aiMessages).values({ conversationId: conversation.id, role: "user", content }).returning();
  const history = await db.select().from(schema.aiMessages)
    .where(eq(schema.aiMessages.conversationId, conversation.id)).orderBy(desc(schema.aiMessages.createdAt)).limit(20);
  const context = await workspaceContext(db, userId);
  const baseUrl = (process.env.AI_BASE_URL ?? "http://127.0.0.1:8645/v1").replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const providerMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `Reply in ${language}. Write action labels in ${language} too.` },
      { role: "system", content: `Authorized workspace snapshot:\n${JSON.stringify(context)}` },
      ...history.reverse().map((message) => ({ role: message.role, content: message.content })),
    ];
    type ProviderBody = {
      id?: string;
      choices?: {
        finish_reason?: string | null;
        message?: { content?: string | { text?: string }[] | null; reasoning?: string; reasoning_content?: string };
      }[];
      error?: { message?: string };
    };
    const callProvider = async (maxTokens: number, retry = false) => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.AI_API_KEY ?? "unused-proxy-attaches-real-creds"}`, "Content-Type": "application/json" },
        body: JSON.stringify({
        model: process.env.AI_MODEL ?? "stepfun/step-3.7-flash:free",
        messages: retry
          ? [...providerMessages, { role: "system", content: "Return the final JSON response now. Keep reasoning brief and ensure reply is non-empty." }]
          : providerMessages,
        temperature: 0.2,
        max_tokens: maxTokens,
        reasoning: { effort: "low", exclude: true },
        }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null) as ProviderBody | null;
      return { response, body };
    };
    const extractContent = (body: ProviderBody | null) => {
      const contentValue = body?.choices?.[0]?.message?.content;
      if (typeof contentValue === "string") return contentValue.trim();
      if (Array.isArray(contentValue)) return contentValue.map((part) => part?.text ?? "").join("").trim();
      return "";
    };

    let providerResult = await callProvider(3_000);
    if (!providerResult.response.ok) {
      console.error("Opero provider error", providerResult.response.status, providerResult.body?.error?.message);
      return res.status(502).json({ error: providerResult.response.status === 401 ? "AI authentication failed. Check the Nous API key." : "Opero could not complete the request." });
    }
    let raw = extractContent(providerResult.body);
    if (!raw) {
      console.warn("Opero received empty content; retrying", {
        traceId: providerResult.body?.id,
        finishReason: providerResult.body?.choices?.[0]?.finish_reason,
        hadReasoning: Boolean(providerResult.body?.choices?.[0]?.message?.reasoning || providerResult.body?.choices?.[0]?.message?.reasoning_content),
      });
      providerResult = await callProvider(4_000, true);
      if (!providerResult.response.ok) {
        console.error("Opero retry error", providerResult.response.status, providerResult.body?.error?.message);
        return res.status(502).json({ error: "Opero could not complete the request." });
      }
      raw = extractContent(providerResult.body);
    }
    if (!raw) {
      console.error("Opero retry returned empty content", { traceId: providerResult.body?.id, finishReason: providerResult.body?.choices?.[0]?.finish_reason });
      return res.status(502).json({ error: "Opero could not generate a final answer. Please try again." });
    }
    const parsed = parseModelResponse(raw);
    const [assistantMessage] = await db.insert(schema.aiMessages).values({ conversationId: conversation.id, role: "assistant", content: parsed.reply, actions: parsed.actions }).returning();
    const title = conversation.title === "New conversation" ? content.slice(0, 60) : conversation.title;
    await db.update(schema.aiConversations).set({ title, updatedAt: new Date() }).where(eq(schema.aiConversations.id, conversation.id));
    res.json({ userMessage, assistantMessage });
  } catch (error) {
    console.error("Opero request failed", error);
    res.status(502).json({ error: error instanceof Error && error.name === "AbortError" ? "Opero timed out. Please try again." : "Cannot reach the AI provider." });
  } finally {
    clearTimeout(timeout);
  }
});

async function executeAction(db: ReturnType<typeof getDb>, action: OperoAction, userId: string) {
  const data = action.data;
  if (action.type === "create_project") {
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) throw new Error("Project name is required");
    let [org] = await db.select().from(schema.organizations).limit(1);
    if (!org) [org] = await db.insert(schema.organizations).values({ name: "Default Organization" }).returning();
    const [created] = await db.insert(schema.projects).values({ name, orgId: org.id, createdByUserId: userId }).returning();
    return created;
  }
  if (action.type === "update_project" || action.type === "delete_project") {
    const id = typeof data.id === "string" ? data.id : "";
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
    if (!project) throw new Error("Project not found");
    if (!canEditProject(project, userId)) throw new Error("You cannot change this project");
    if (action.type === "delete_project") {
      await db.delete(schema.projects).where(eq(schema.projects.id, id));
      return { id };
    }
    const updates: Record<string, unknown> = {};
    if (typeof data.name === "string" && data.name.trim()) updates.name = data.name.trim();
    if (typeof data.status === "string" && PROJECT_STATUSES.has(data.status)) {
      updates.status = data.status;
      updates.statusChangedAt = data.status === "active" ? null : new Date();
    }
    if (typeof data.isPrivate === "boolean") updates.isPrivate = data.isPrivate;
    if (!Object.keys(updates).length) throw new Error("No valid project changes");
    const [updated] = await db.update(schema.projects).set(updates).where(eq(schema.projects.id, id)).returning();
    return updated;
  }
  if (action.type === "create_task") {
    const projectId = typeof data.projectId === "string" ? data.projectId : "";
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).limit(1);
    if (!project || !canViewProject(project, userId)) throw new Error("Project not found or unavailable");
    if (!title) throw new Error("Task title is required");
    let assigneeUserIds = Array.isArray(data.assigneeUserIds) ? data.assigneeUserIds.filter((id): id is string => typeof id === "string") : [];
    if (project.isPersonal && assigneeUserIds.length === 0) assigneeUserIds = [userId];
    if (project.isPersonal && !canMutateDailyTask(userId, assigneeUserIds)) throw new Error("Daily task permissions do not allow this assignment");
    const status = typeof data.status === "string" && TASK_STATUSES.has(data.status) ? data.status : "todo";
    const priority = typeof data.priority === "string" && PRIORITIES.has(data.priority) ? data.priority : null;
    const [task] = await db.insert(schema.tasks).values({ projectId, title, description: typeof data.description === "string" ? data.description : null, status: status as typeof schema.tasks.$inferInsert.status, priority: priority as typeof schema.tasks.$inferInsert.priority, dueDate: parseDueDateInput(data.dueDate), assigneeUserId: assigneeUserIds[0] ?? null, createdByUserId: userId, completedAt: initialCompletedAtForStatus(status) }).returning();
    await syncTaskAssignees(db, task.id, assigneeUserIds);
    return task;
  }
  const id = typeof data.id === "string" ? data.id : "";
  const context = await getTaskProjectContext(db, id);
  if (!context || !canViewProject(context.project, userId)) throw new Error("Task not found or unavailable");
  const currentAssignees = await getAssigneeIdsForTask(db, id);
  if (!canUpdateTask(userId, context.task, context.project, currentAssignees)) throw new Error("Only the task creator, project owner, or Daily assignee can change this task");
  if (context.project.isPersonal && !canMutateDailyTask(userId, currentAssignees)) throw new Error("You cannot change this Daily task");
  if (action.type === "delete_task") {
    await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
    return { id };
  }
  const updates: Record<string, unknown> = {};
  if (typeof data.title === "string" && data.title.trim()) updates.title = data.title.trim();
  if (typeof data.description === "string" || data.description === null) updates.description = data.description;
  if (typeof data.status === "string" && TASK_STATUSES.has(data.status)) { updates.status = data.status; applyCompletedAtUpdate(updates, data.status, context.task.status); }
  if ((typeof data.priority === "string" && PRIORITIES.has(data.priority)) || data.priority === null) updates.priority = data.priority;
  if (typeof data.dueDate === "string" || data.dueDate === null) updates.dueDate = parseDueDateInput(data.dueDate);
  let task = context.task;
  if (Object.keys(updates).length) [task] = await db.update(schema.tasks).set(updates).where(eq(schema.tasks.id, id)).returning();
  if (Array.isArray(data.assigneeUserIds)) {
    const next = data.assigneeUserIds.filter((value): value is string => typeof value === "string");
    if (context.project.isPersonal && !canMutateDailyTask(userId, next)) throw new Error("Daily task permissions do not allow this assignment");
    await syncTaskAssignees(db, id, next);
  }
  if (!Object.keys(updates).length && !Array.isArray(data.assigneeUserIds)) throw new Error("No valid task changes");
  return task;
}

router.post("/messages/:messageId/actions/:actionIndex/execute", async (req, res) => {
  if (!isDbConfigured()) return res.status(503).json({ error: "Database not configured" });
  const db = getDb();
  const userId = userIdFor(req);
  const [message] = await db.select({ message: schema.aiMessages, conversation: schema.aiConversations })
    .from(schema.aiMessages).innerJoin(schema.aiConversations, eq(schema.aiMessages.conversationId, schema.aiConversations.id))
    .where(and(eq(schema.aiMessages.id, req.params.messageId), eq(schema.aiConversations.userId, userId))).limit(1);
  if (!message) return res.status(404).json({ error: "Action not found" });
  const index = Number(req.params.actionIndex);
  const actions = message.message.actions as OperoAction[];
  const action = actions[index];
  if (!action) return res.status(404).json({ error: "Action not found" });
  if (action.status === "completed") return res.status(409).json({ error: "Action was already applied" });
  try {
    const result = await executeAction(db, action, userId);
    actions[index] = { ...action, status: "completed" };
    await db.update(schema.aiMessages).set({ actions }).where(eq(schema.aiMessages.id, message.message.id));
    res.json({ action: actions[index], result });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Action could not be applied" });
  }
});

export default router;
