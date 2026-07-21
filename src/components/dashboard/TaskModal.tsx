import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiTask, Priority, TaskStatus } from "@/lib/mock-data";
import type { ApiMember } from "@/lib/api";
import { useColumnConfig } from "@/i18n/use-labels";
import { resolveAssignee } from "@/components/dashboard/AssigneeAvatar";

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority | "";
  dueDate: string;
  assigneeUserId: string | null;
}

const emptyForm = (
  status: TaskStatus = "todo",
  defaultAssignee: string | null = null,
): TaskFormData => ({
  title: "",
  description: "",
  status,
  priority: "",
  dueDate: "",
  assigneeUserId: defaultAssignee,
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
  /** When creating, default assignee to current user (Daily board). */
  defaultAssigneeToMe?: boolean;
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
}: TaskModalProps) {
  const { t } = useTranslation();
  const columns = useColumnConfig();
  const [form, setForm] = useState<TaskFormData>(emptyForm(defaultStatus));

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title,
          description: task.description ?? "",
          status: task.status,
          priority: task.priority ?? "",
          dueDate: task.dueDate ?? "",
          assigneeUserId: task.assigneeUserId ?? null,
        });
      } else {
        setForm(
          emptyForm(
            defaultStatus,
            defaultAssigneeToMe && currentUserId ? currentUserId : null,
          ),
        );
      }
    }
  }, [open, task, defaultStatus, currentUserId, defaultAssigneeToMe]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  };

  const assigneeOptions = (() => {
    const ids = new Set(members.map((m) => m.id));
    if (currentUserId && !ids.has(currentUserId)) {
      return [
        {
          id: currentUserId,
          label: t("tasks.assigneeMe"),
        },
        ...members.map((m) => ({
          id: m.id,
          label: resolveAssignee(m.id, members, currentUserId)?.label ?? m.id,
        })),
      ];
    }
    return members.map((m) => ({
      id: m.id,
      label:
        m.id === currentUserId
          ? t("tasks.assigneeMe")
          : resolveAssignee(m.id, members, currentUserId)?.label ?? m.id,
    }));
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{task ? t("tasks.editTask") : t("tasks.addTask")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("tasks.title")}</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("tasks.titlePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("tasks.description")}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("tasks.descriptionPlaceholder")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("tasks.status")}</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("tasks.priority")}</label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as Priority | "" }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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
            <input
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("tasks.dueDatePlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("tasks.assignee")}</label>
            <select
              value={form.assigneeUserId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  assigneeUserId: e.target.value || null,
                }))
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("tasks.unassigned")}</option>
              {assigneeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
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
        </form>
      </div>
    </div>
  );
}
