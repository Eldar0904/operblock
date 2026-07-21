import type { ApiTask } from "@/lib/mock-data";
import { isOverdue } from "@/lib/task-utils";

export interface DailyHealthStats {
  open: number;
  done: number;
  overdue: number;
  unassignedOpen: number;
  total: number;
}

export interface ProjectsHealthStats {
  open: number;
  inReview: number;
  overdue: number;
  completionPct: number;
  total: number;
  done: number;
}

export function splitTasksByDaily(tasks: ApiTask[], dailyProjectIds: Set<string>) {
  const daily = tasks.filter((t) => dailyProjectIds.has(t.projectId));
  const projects = tasks.filter((t) => !dailyProjectIds.has(t.projectId));
  return { daily, projects };
}

export function computeDailyHealth(tasks: ApiTask[]): DailyHealthStats {
  const openTasks = tasks.filter((t) => t.status !== "done");
  return {
    open: openTasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter(isOverdue).length,
    unassignedOpen: openTasks.filter((t) => !t.assigneeUserId).length,
    total: tasks.length,
  };
}

export function computeProjectsHealth(tasks: ApiTask[]): ProjectsHealthStats {
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  return {
    open: tasks.filter((t) => t.status !== "done").length,
    inReview: tasks.filter((t) => t.status === "in_review").length,
    overdue: tasks.filter(isOverdue).length,
    completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
    total,
    done,
  };
}
