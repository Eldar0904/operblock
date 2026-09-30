import { CheckCircle2, Circle, Users } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { useMemo } from "react";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useDailyProject, useMembersList } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { getTaskAssigneeIds, isDailyOpenStatus } from "@/lib/task-status";

export default function TeamPage() {
  const { data: dailyProject, isLoading: dailyLoading } = useDailyProject();
  const members = useMembersList();
  const { data: tasks = [], isLoading: tasksLoading, isError } = useTasks(dailyProject?.id);

  const cards = useMemo(
    () =>
      members.map((member) => {
        const personTasks = tasks.filter((task) => getTaskAssigneeIds(task).includes(member.id));
        return {
          id: member.id,
          name: member.fullName ?? member.email ?? "Сотрудник",
          open: personTasks.filter(
            (task) => isDailyOpenStatus(task.status) && task.status !== "done",
          ),
          done: personTasks.filter((task) => task.status === "done"),
        };
      }),
    [members, tasks],
  );

  const loading = dailyLoading || tasksLoading;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">Общая работа</p>
          <h1 className="text-base font-semibold">Команда</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Команда</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Те же рабочие задачи — собранные в отдельных карточках каждого сотрудника.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка задач…</p>
          ) : isError ? (
            <p className="text-sm text-red-600">Не удалось загрузить задачи команды.</p>
          ) : cards.length === 0 ? (
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <Users className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">В команде пока нет участников.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <section key={card.id} className="overflow-hidden rounded-xl border border-border bg-background">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h3 className="font-semibold">{card.name}</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {card.open.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-border">
                    <TaskColumn
                      icon={Circle}
                      title="В работе"
                      tasks={card.open.map((task) => task.title)}
                      empty="Нет задач"
                    />
                    <TaskColumn
                      icon={CheckCircle2}
                      title="Готово"
                      tasks={card.done.map((task) => task.title)}
                      empty="Нет завершённых"
                      done
                    />
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function TaskColumn({
  icon: Icon,
  title,
  tasks,
  empty,
  done = false,
}: {
  icon: typeof Circle;
  title: string;
  tasks: string[];
  empty: string;
  done?: boolean;
}) {
  return (
    <div className="min-w-0 p-3">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${done ? "text-emerald-600" : ""}`} />
        <span>{title}</span>
      </div>
      {tasks.length ? (
        <ul className="space-y-2">
          {tasks.map((task, index) => (
            <li
              key={`${task}-${index}`}
              className={`rounded-md bg-muted/60 px-2.5 py-2 text-xs leading-snug ${done ? "text-muted-foreground line-through" : ""}`}
            >
              {task}
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
