import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useProjects } from "@/hooks/useProjects";
import {
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useUpdateGoal,
} from "@/hooks/useGoals";
import type { ApiGoal } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GoalFormState {
  title: string;
  description: string;
  projectIds: string[];
}

const emptyForm = (): GoalFormState => ({
  title: "",
  description: "",
  projectIds: [],
});

export default function GoalsPage() {
  const { t } = useTranslation();
  const { data: goals = [], isLoading, isError } = useGoals();
  const { data: projects = [] } = useProjects();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiGoal | null>(null);
  const [form, setForm] = useState<GoalFormState>(emptyForm());

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? "",
        projectIds: editing.projectIds ?? [],
      });
    } else {
      setForm(emptyForm());
    }
  }, [modalOpen, editing]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (goal: ApiGoal) => {
    setEditing(goal);
    setModalOpen(true);
  };

  const toggleProject = (projectId: string) => {
    setForm((f) => ({
      ...f,
      projectIds: f.projectIds.includes(projectId)
        ? f.projectIds.filter((id) => id !== projectId)
        : [...f.projectIds, projectId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    if (editing) {
      updateGoal.mutate(
        {
          id: editing.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          projectIds: form.projectIds,
        },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      createGoal.mutate(
        {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          projectIds: form.projectIds,
        },
        { onSuccess: () => setModalOpen(false) },
      );
    }
  };

  const handleDelete = (goal: ApiGoal) => {
    if (window.confirm(t("goals.deleteConfirm", { title: goal.title }))) {
      deleteGoal.mutate(goal.id);
    }
  };

  const isSubmitting = createGoal.isPending || updateGoal.isPending;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("goals.objectives")}</p>
          <h1 className="text-base font-semibold">{t("goals.title")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-50 p-2">
              <Target className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("goals.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/reports"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {t("goals.viewReports")}
            </Link>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              {t("goals.addGoal")}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("goals.loadingStats")}</p>
        ) : isError ? (
          <p className="text-sm text-red-600">{t("goals.loadError")}</p>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-indigo-50 p-4">
              <Target className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-base font-semibold">{t("goals.empty")}</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("goals.emptyDesc")}</p>
            <Button
              size="sm"
              className="mt-4 bg-indigo-600 hover:bg-indigo-700"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("goals.addGoal")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-lg border border-border bg-background p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{goal.title}</h3>
                    {goal.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(goal)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(goal)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${goal.progressPercent}%` }}
                  />
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("goals.complete", { percent: goal.progressPercent })}
                  {goal.totalTasks > 0 && (
                    <span className="ml-1">
                      ({goal.doneTasks}/{goal.totalTasks})
                    </span>
                  )}
                </p>

                {goal.projects.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {goal.projects.map((p) => (
                      <span
                        key={p.id}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{t("goals.noProjects")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-lg border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">
                {editing ? t("goals.editGoal") : t("goals.addGoal")}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("goals.goalTitle")}</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t("goals.goalTitlePlaceholder")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("goals.goalDescription")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t("goals.goalDescriptionPlaceholder")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{t("goals.linkProjects")}</label>
                {projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("goals.noProjectsAvailable")}</p>
                ) : (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                    {projects.map((project) => {
                      const checked = form.projectIds.includes(project.id);
                      return (
                        <label
                          key={project.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                            checked && "bg-indigo-50",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProject(project.id)}
                            className="rounded border-input"
                          />
                          <span>{project.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-[11px] text-muted-foreground">{t("goals.linkHint")}</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.title.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting
                    ? t("tasks.saving")
                    : editing
                      ? t("tasks.saveChanges")
                      : t("goals.createGoal")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
