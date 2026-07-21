import type { ApiProject, ApiTask, TaskStatus } from "@/lib/mock-data";

export interface ApiMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  imageUrl: string | null;
}

export interface ApiComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(body || response.statusText, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; db: boolean }>("/health"),

  getProjects: (token: string | null) =>
    request<ApiProject[]>("/projects", {}, token),

  getDailyProject: (token: string | null) =>
    request<ApiProject>("/projects/daily", {}, token),

  getMembers: (token: string | null) =>
    request<ApiMember[]>("/members", {}, token),

  createProject: (token: string | null, data: { name: string; orgId?: string }) =>
    request<ApiProject>("/projects", { method: "POST", body: JSON.stringify(data) }, token),

  updateProject: (token: string | null, id: string, data: Partial<{ name: string }>) =>
    request<ApiProject>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  deleteProject: (token: string | null, id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }, token),

  getTasks: (token: string | null, projectId?: string) => {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return request<ApiTask[]>(`/tasks${query}`, {}, token);
  },

  createTask: (
    token: string | null,
    data: {
      projectId: string;
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: string;
      dueDate?: string;
      assigneeUserId?: string;
    },
  ) => request<ApiTask>("/tasks", { method: "POST", body: JSON.stringify(data) }, token),

  updateTask: (
    token: string | null,
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      status: TaskStatus;
      priority: string | null;
      dueDate: string | null;
      assigneeUserId: string | null;
    }>,
  ) => request<ApiTask>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  deleteTask: (token: string | null, id: string) =>
    request<void>(`/tasks/${id}`, { method: "DELETE" }, token),

  getComments: (token: string | null, taskId: string) =>
    request<ApiComment[]>(`/tasks/${taskId}/comments`, {}, token),

  createComment: (token: string | null, taskId: string, content: string) =>
    request<ApiComment>(
      `/tasks/${taskId}/comments`,
      { method: "POST", body: JSON.stringify({ content }) },
      token,
    ),

  deleteComment: (token: string | null, id: string) =>
    request<void>(`/comments/${id}`, { method: "DELETE" }, token),

  getReportSummary: (
    token: string | null,
    params: { period: string; projectId?: string; anchor?: string },
  ) => {
    const search = new URLSearchParams({ period: params.period });
    if (params.projectId) search.set("projectId", params.projectId);
    if (params.anchor) search.set("anchor", params.anchor);
    return request<ReportSummary>(`/reports/summary?${search.toString()}`, {}, token);
  },
};

export interface ReportSummary {
  period: { start: string; end: string; label: string };
  previousPeriod: { start: string; end: string; label: string };
  completed: number;
  created: number;
  deltaCompleted: number;
  avgCycleTimeDays: number;
  velocity: number;
  velocityDaily: number;
  velocityProjects: number;
  completedDaily: number;
  completedProjects: number;
  throughput: { bucket: string; count: number }[];
  byAssignee: { userId: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byProject: { projectId: string; name: string; count: number }[];
  completedTasks: ApiTask[];
}
