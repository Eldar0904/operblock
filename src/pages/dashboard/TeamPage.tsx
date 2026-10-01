import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  CircleAlert,
  Inbox,
  Play,
  UserRound,
  Users,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useDailyProject, useMembersList } from "@/hooks/useProjects";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { getTaskAssigneeIds, isDailyOpenStatus } from "@/lib/task-status";
import type { ApiMember } from "@/lib/api";
import type { ApiTask } from "@/lib/mock-data";

export default function TeamPage() {
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId: string }>();
  const { data: dailyProject, isLoading: dailyLoading } = useDailyProject();
  const members = useMembersList();
  const { data: tasks = [], isLoading: tasksLoading, isError } = useTasks(dailyProject?.id);
  const activeMember = members.find((member) => member.id === memberId);

  if (memberId && activeMember) {
    return (
      <MemberWorkspace
        member={activeMember}
        tasks={tasks}
        loading={dailyLoading || tasksLoading}
        error={isError}
        onBack={() => navigate("/dashboard/team")}
      />
    );
  }

  return (
    <TeamCards
      members={members}
      tasks={tasks}
      loading={dailyLoading || tasksLoading}
    />
  );
}

function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div>
        <p className="text-xs text-muted-foreground">{eyebrow}</p>
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
      </div>
    </header>
  );
}

function TeamCards({
  members,
  tasks,
  loading,
}: {
  members: ApiMember[];
  tasks: ApiTask[];
  loading: boolean;
}) {
  const navigate = useNavigate();
  const updateTask = useUpdateTask();

  const { incoming, blocked, workByMember } = useMemo(() => {
    const openTasks = tasks.filter((task) => isDailyOpenStatus(task.status) && task.status !== "done");
    const assignedTasks = new Map<string, number>();

    openTasks.forEach((task) => {
      getTaskAssigneeIds(task).forEach((memberId) => {
        assignedTasks.set(memberId, (assignedTasks.get(memberId) ?? 0) + 1);
      });
    });

    return {
      incoming: openTasks.filter((task) => getTaskAssigneeIds(task).length === 0),
      blocked: tasks.filter((task) => task.status === "paused"),
      workByMember: assignedTasks,
    };
  }, [tasks]);

  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.fullName ??
    members.find((member) => member.id === memberId)?.email ??
    "Сотрудник";

  return (
    <>
      <Header eyebrow="Общая работа" title="Команда" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight">Команда</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Общие задачи, ожидания и рабочие пространства команды.
          </p>

          {loading ? (
            <p className="mt-8 text-sm text-muted-foreground">Загрузка команды…</p>
          ) : (
            <>
              <div className="mt-7 grid gap-4 lg:grid-cols-5">
                <section className="overflow-hidden rounded-xl border border-border bg-background lg:col-span-3">
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Inbox className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Входящие</h3>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {incoming.length} без исполнителя
                    </span>
                  </div>
                  {incoming.length ? (
                    <ul className="divide-y divide-border">
                      {incoming.slice(0, 4).map((task) => (
                        <li key={task.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{task.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Нужен исполнитель</p>
                          </div>
                          <select
                            aria-label={`Назначить задачу «${task.title}»`}
                            defaultValue=""
                            disabled={updateTask.isPending || members.length === 0}
                            onChange={(event) => {
                              if (!event.target.value) return;
                              updateTask.mutate({
                                id: task.id,
                                assigneeUserId: event.target.value,
                                assigneeUserIds: [event.target.value],
                              });
                            }}
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            <option value="" disabled>Назначить</option>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.fullName ?? member.email ?? "Сотрудник"}
                              </option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 py-7 text-sm text-muted-foreground">
                      Все текущие задачи уже назначены.
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-border bg-background p-5 lg:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CircleAlert className="h-4 w-4 text-amber-600" />
                      <h3 className="font-semibold">Нужна помощь</h3>
                    </div>
                    <span className="text-sm text-muted-foreground">{blocked.length}</span>
                  </div>
                  {blocked.length ? (
                    <ul className="mt-4 space-y-3">
                      {blocked.slice(0, 3).map((task) => {
                        const assigneeId = getTaskAssigneeIds(task)[0];
                        return (
                          <li key={task.id} className="rounded-lg bg-amber-50 px-3 py-2.5">
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="mt-1 text-xs text-amber-800">
                              {assigneeId ? `Ожидает: ${memberName(assigneeId)}` : "Ожидает решения"}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                      <Play className="h-4 w-4 text-primary" />
                      Нет остановленных задач.
                    </div>
                  )}
                </section>
              </div>

              <section className="mt-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-lg font-semibold">Люди</h3>
                  <p className="text-sm text-muted-foreground">Открыть задачи человека</p>
                </div>

                {members.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-border bg-background p-8 text-center">
                    <Users className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">В команде пока нет участников.</p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((member) => {
                      const personName = member.fullName ?? member.email ?? "Сотрудник";
                      const taskCount = workByMember.get(member.id) ?? 0;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => navigate(`/dashboard/team/${member.id}`)}
                          className="group rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <UserRound className="h-4 w-4" />
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </div>
                          <h4 className="mt-4 font-semibold">{personName}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {taskCount === 1 ? "1 активная задача" : `${taskCount} активных задач`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function MemberWorkspace({
  member,
  tasks,
  loading,
  error,
  onBack,
}: {
  member: ApiMember;
  tasks: ApiTask[];
  loading: boolean;
  error: boolean;
  onBack: () => void;
}) {
  const personName = member.fullName ?? member.email ?? "Сотрудник";
  const { open, done } = useMemo(() => {
    const personTasks = tasks.filter((task) => getTaskAssigneeIds(task).includes(member.id));
    return {
      open: personTasks.filter(
        (task) => isDailyOpenStatus(task.status) && task.status !== "done",
      ),
      done: personTasks.filter((task) => task.status === "done"),
    };
  }, [tasks, member.id]);

  return (
    <>
      <Header eyebrow="Команда / рабочее пространство" title={personName} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к команде
          </button>

          <section className="flex items-center gap-4 rounded-xl border border-border bg-background p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{personName}</h2>
          </section>

          {loading ? (
            <p className="mt-6 text-sm text-muted-foreground">Загрузка задач…</p>
          ) : error ? (
            <p className="mt-6 text-sm text-red-600">Не удалось загрузить задачи.</p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TaskColumn icon={Circle} title="В работе" tasks={open} empty="Нет задач в работе" />
              <TaskColumn icon={CheckCircle2} title="Готово" tasks={done} empty="Нет завершённых задач" done />
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
  tasks: Array<{ id: string; title: string }>;
  empty: string;
  done?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-background p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${done ? "text-emerald-600" : "text-primary"}`} />
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground">({tasks.length})</span>
      </div>
      {tasks.length ? (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`rounded-md bg-muted/60 px-3 py-2.5 text-sm ${done ? "text-muted-foreground line-through" : ""}`}
            >
              {task.title}
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}
