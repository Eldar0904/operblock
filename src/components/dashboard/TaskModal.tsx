import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiTask, Priority, TaskStatus } from "@/lib/mock-data";
import type { ApiMember } from "@/lib/api";
import { getTaskAssigneeIds } from "@/lib/task-status";
import { useColumnConfig } from "@/i18n/use-labels";
import { AssigneeAvatar, resolveAssignee } from "@/components/dashboard/AssigneeAvatar";
import { DateTimeField } from "@/components/dashboard/DateTimeField";
import { useComments, useCreateComment, useDeleteComment } from "@/hooks/useComments";

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority | "";
  dueDate: string;
  assigneeUserId: string | null;
  assigneeUserIds: string[];
}

const emptyForm = (
  status: TaskStatus = "todo",
  defaultAssignees: string[] = [],
): TaskFormData => ({
  title: "",
  description: "",
  status,
  priority: "",
  dueDate: "",
  assigneeUserId: defaultAssignees[0] ?? null,
  assigneeUserIds: defaultAssignees,
});

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  task?: ApiTask | null;
  defaultStatus?: TaskStatus;
  isSubmitting?: boolean;
  currentUserId?: string;
  members?: ApiMember[];
  defaultAssigneeToMe?: boolean;
  defaultAssigneeUserId?: string | null;
  hideStatus?: boolean;
  /** Daily board: multi-participant assign + pause/cancel in modal */
  dailyMode?: boolean;
  readOnly?: boolean;
}

export function TaskModal({
  open,
  onClose,
  onSubmit,
  task,
  defaultStatus = "todo",
  isSubmitting,
  currentUserId,
  members = [],
  defaultAssigneeToMe = false,
  defaultAssigneeUserId,
  hideStatus = false,
  dailyMode = false,
  readOnly = false,
}: TaskModalProps) {
  const { t } = useTranslation();
  const columns = useColumnConfig();
  const [form, setForm] = useState<TaskFormData>(emptyForm(defaultStatus));
  const [commentText, setCommentText] = useState("");

  const { data: comments = [], isLoading: commentsLoading } = useComments(task?.id);
  const createComment = useCreateComment(task?.id);
  const deleteComment = useDeleteComment(task?.id);

  useEffect(() => {
    if (open) {
      setCommentText("");
      if (task) {
        const ids = getTaskAssigneeIds(task);
        setForm({
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          priority: task.priority ?? "",
          dueDate: task.dueDate ?? "",
          assigneeUserId: ids[0] ?? null,
          assigneeUserIds: ids,
        });
      } else {
        let assignees: string[] = [];
        if (defaultAssigneeUserId !== undefined) {
          assignees = defaultAssigneeUserId ? [defaultAssigneeUserId] : [];
        } else if (defaultAssigneeToMe && currentUserId) {
          assignees = [currentUserId];
        }
        setForm(emptyForm(defaultStatus, assignees));
      }
    }
  }, [open, task, defaultStatus, currentUserId, defaultAssigneeToMe, defaultAssigneeUserId]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || readOnly) return;
    if (hideStatus && !task) {
      onSubmit({ ...form, status: "todo" });
      return;
    }
    onSubmit(form);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    const content = commentText.trim();
    if (!content || !task) return;
    createComment.mutate(content, {
      onSuccess: () => setCommentText(""),
    });
  };

  const toggleParticipant = (userId: string) => {
    setForm((f) => {
      const has = f.assigneeUserIds.includes(userId);
      const next = has
        ? f.assigneeUserIds.filter((id) => id !== userId)
        : [...f.assigneeUserIds, userId];
      return {
        ...f,
        assigneeUserIds: next,
        assigneeUserId: next[0] ?? null,
      };
    });
  };

  const setTerminalStatus = (status: TaskStatus) => {
    setForm((f) => ({ ...f, status }));
    onSubmit({ ...form, status });
  };

  const memberLabel = (member: ApiMember) =>
    resolveAssignee(member.id, members, currentUserId)?.label ?? member.id;

  const assigneeOptions = members.map((m) => ({
    id: m.id,
    label: memberLabel(m),
  }));

  const showDailyActions =
    dailyMode && task && !readOnly && form.status !== "paused" && form.status !== "canceled";

  const showReopen =
    dailyMode && task && !readOnly && (form.status === "paused" || form.status === "canceled");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <h2 className="text-base font-semibold">{task ? t("tasks.editTask") : t("tasks.addTask")}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("tasks.title")}</label>
            <input
              required
              readOnly={readOnly}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              placeholder={t("tasks.titlePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("tasks.description")}</label>
            <textarea
              readOnly={readOnly}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              placeholder={t("tasks.descriptionPlaceholder")}
            />
          </div>
          <div className={cn("grid gap-4", hideStatus ? "grid-cols-1" : "grid-cols-2")}>
            {!hideStatus && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("tasks.status")}</label>
                <select
                  disabled={readOnly}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("tasks.priority")}</label>
              <select
                disabled={readOnly}
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as Priority | "" }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">{t("priority.none")}</option>
                <option value="low">{t("priority.low")}</option>
                <option value="medium">{t("priority.medium")}</option>
                <option value="high">{t("priority.high")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("tasks.dueDate")}</label>
            <DateTimeField
              value={form.dueDate}
              onChange={(iso) => setForm((f) => ({ ...f, dueDate: iso }))}
            />
          </div>
          {dailyMode ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("tasks.participants")}</label>
              <p className="mb-2 text-xs text-muted-foreground">{t("daily.participantsHint")}</p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-input p-2">
                {members.map((member) => {
                  const checked = form.assigneeUserIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                        readOnly && "pointer-events-none opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly}
                        onChange={() => toggleParticipant(member.id)}
                        className="rounded border-input"
                      />
                      <AssigneeAvatar
                        userId={member.id}
                        members={members}
                        currentUserId={currentUserId}
                        showLabel
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("tasks.assignee")}</label>
              <select
                disabled={readOnly}
                value={form.assigneeUserId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setForm((f) => ({
                    ...f,
                    assigneeUserId: id,
                    assigneeUserIds: id ? [id] : [],
                  }));
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">{t("tasks.unassigned")}</option>
                {assigneeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(showDailyActions || showReopen) && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {showDailyActions && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => setTerminalStatus("paused")}
                  >
                    {t("daily.pauseTask")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => setTerminalStatus("canceled")}
                  >
                    {t("daily.cancelTask")}
                  </Button>
                </>
              )}
              {showReopen && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setTerminalStatus("todo")}
                >
                  {t("daily.reopenTask")}
                </Button>
              )}
            </div>
          )}

          {!readOnly && (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.title.trim()}
                className={cn("bg-indigo-600 hover:bg-indigo-700")}
              >
                {isSubmitting ? t("tasks.saving") : task ? t("tasks.saveChanges") : t("tasks.createTask")}
              </Button>
            </div>
          )}
        </form>

        {task && (
          <div className="border-t border-border px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold">{t("comments.title")}</h3>
            {commentsLoading ? (
              <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
            ) : comments.length === 0 ? (
              <p className="mb-3 text-xs text-muted-foreground">{t("comments.noComments")}</p>
            ) : (
              <ul className="mb-3 max-h-48 space-y-3 overflow-y-auto">
                {comments.map((comment) => (
                  <li key={comment.id} className="rounded-md bg-muted/40 px-3 py-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <AssigneeAvatar
                        userId={comment.userId}
                        members={members}
                        currentUserId={currentUserId}
                        showLabel
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                        {comment.userId === currentUserId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-600 hover:text-red-700"
                            onClick={() => deleteComment.mutate(comment.id)}
                            disabled={deleteComment.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t("comments.commentPlaceholder")}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentText.trim() || createComment.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {t("comments.addComment")}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
