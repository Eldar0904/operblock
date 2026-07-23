export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "paused"
  | "canceled";
export type Priority = "low" | "medium" | "high";
export type ProjectStatus = "active" | "paused" | "canceled";

export interface ApiTask {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: Priority | null;
  dueDate?: string | null;
  assigneeUserId?: string | null;
  assigneeUserIds?: string[];
  createdAt?: string;
  completedAt?: string | null;
  tag?: string;
  tagColor?: string;
  comments?: number;
  assignee?: { initials: string; color: string };
}

export interface ApiProject {
  id: string;
  orgId: string;
  name: string;
  isPersonal?: boolean;
  status?: ProjectStatus;
  statusChangedAt?: string | null;
  createdByUserId?: string | null;
  portfolioId?: string | null;
  createdAt?: string;
}

export interface ApiPortfolio {
  id: string;
  orgId: string;
  name: string;
  createdByUserId?: string | null;
  createdAt?: string;
}

export const MOCK_PROJECT: ApiProject = {
  id: "mock-project-1",
  orgId: "mock-org-1",
  name: "Q3 Launch: Project Nova",
  isPersonal: false,
};

export const MOCK_DAILY_PROJECT: ApiProject = {
  id: "mock-daily-1",
  orgId: "mock-org-1",
  name: "Daily",
  isPersonal: true,
};

export const MOCK_TASKS: ApiTask[] = [
  {
    id: "NOV-201",
    projectId: MOCK_PROJECT.id,
    title: "Research competitor onboarding flows",
    status: "backlog",
    priority: "low",
    dueDate: "Aug 12",
    tag: "Research",
    tagColor: "bg-purple-100 text-purple-700",
    comments: 2,
    assignee: { initials: "AK", color: "bg-orange-400" },
  },
  {
    id: "NOV-202",
    projectId: MOCK_PROJECT.id,
    title: "Draft API documentation outline",
    status: "backlog",
    priority: "medium",
    tag: "Docs",
    tagColor: "bg-slate-100 text-slate-700",
    assignee: { initials: "JL", color: "bg-blue-400" },
  },
  {
    id: "NOV-203",
    projectId: MOCK_PROJECT.id,
    title: "Design landing page hero section",
    status: "todo",
    priority: "high",
    dueDate: "Jul 25",
    tag: "Design",
    tagColor: "bg-pink-100 text-pink-700",
    comments: 5,
    assignee: { initials: "MR", color: "bg-emerald-400" },
  },
  {
    id: "NOV-204",
    projectId: MOCK_PROJECT.id,
    title: "Set up CI/CD pipeline",
    status: "todo",
    priority: "medium",
    dueDate: "Jul 28",
    tag: "DevOps",
    tagColor: "bg-blue-100 text-blue-700",
    assignee: { initials: "TS", color: "bg-violet-400" },
  },
  {
    id: "NOV-205",
    projectId: MOCK_PROJECT.id,
    title: "Write release notes template",
    status: "todo",
    priority: "low",
    tag: "Product",
    tagColor: "bg-amber-100 text-amber-700",
    assignee: { initials: "AK", color: "bg-orange-400" },
  },
  {
    id: "NOV-206",
    projectId: MOCK_PROJECT.id,
    title: "Implement Kanban drag-and-drop",
    status: "in_progress",
    priority: "high",
    dueDate: "Jul 22",
    tag: "Engineering",
    tagColor: "bg-indigo-100 text-indigo-700",
    comments: 8,
    assignee: { initials: "JL", color: "bg-blue-400" },
  },
  {
    id: "NOV-207",
    projectId: MOCK_PROJECT.id,
    title: "User testing session prep",
    status: "in_progress",
    priority: "medium",
    dueDate: "Jul 24",
    tag: "UX",
    tagColor: "bg-teal-100 text-teal-700",
    comments: 3,
    assignee: { initials: "MR", color: "bg-emerald-400" },
  },
  {
    id: "NOV-208",
    projectId: MOCK_PROJECT.id,
    title: "Security audit remediation plan",
    status: "in_review",
    priority: "high",
    dueDate: "Jul 20",
    tag: "Security",
    tagColor: "bg-red-100 text-red-700",
    comments: 12,
    assignee: { initials: "TS", color: "bg-violet-400" },
  },
  {
    id: "NOV-209",
    projectId: MOCK_PROJECT.id,
    title: "Project kickoff meeting",
    status: "done",
    priority: "medium",
    tag: "Planning",
    tagColor: "bg-green-100 text-green-700",
    assignee: { initials: "AK", color: "bg-orange-400" },
  },
  {
    id: "NOV-210",
    projectId: MOCK_PROJECT.id,
    title: "Define MVP scope",
    status: "done",
    priority: "high",
    tag: "Product",
    tagColor: "bg-amber-100 text-amber-700",
    assignee: { initials: "MR", color: "bg-emerald-400" },
  },
];

export const COLUMN_CONFIG: { id: TaskStatus; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "in_review", title: "In Review" },
  { id: "done", title: "Done" },
];
