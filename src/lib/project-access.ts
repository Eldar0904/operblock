import type { ApiProject } from "@/lib/mock-data";

/** True if the user may open and view project contents (tasks, board, etc.). */
export function canAccessProjectContents(
  project: Pick<ApiProject, "isPrivate" | "createdByUserId" | "isPersonal">,
  userId: string | null | undefined,
): boolean {
  if (project.isPersonal) return true;
  if (!project.isPrivate) return true;
  if (!project.createdByUserId) return true;
  return Boolean(userId && project.createdByUserId === userId);
}

export function isProjectCreator(
  project: Pick<ApiProject, "createdByUserId">,
  userId: string | null | undefined,
): boolean {
  if (!project.createdByUserId) return true;
  return Boolean(userId && project.createdByUserId === userId);
}
