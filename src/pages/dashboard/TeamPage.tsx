import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Files,
  Landmark,
  MessagesSquare,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { useDailyProject, useMembersList } from "@/hooks/useProjects";
import { useTasks } from "@/hooks/useTasks";
import { getTaskAssigneeIds, isDailyOpenStatus } from "@/lib/task-status";
import type { ApiMember } from "@/lib/api";
import type { ApiTask } from "@/lib/mock-data";

const ROLE_DETAILS = [
  {
    match: ["eldar", "aidar"],
    name: "IT-отдел",
    description: "Разработка, технические задачи и поддержка.",
    icon: Wrench,
  },
  {
    match: ["zulhiya", "зулия", "зульхия"],
    name: "Ресепшен",
    description: "Посетители, звонки и входящие запросы.",
    icon: MessagesSquare,
  },
  {
    match: ["sandu"],
    name: "Сотрудники и документы",
    description: "Кадровые вопросы и документы.",
    icon: Files,
  },
  {
    match: ["nurbek", "нурбек"],
    name: "Помощник руководителя",
    description: "Поручения, решения и контроль исполнения.",
    icon: Landmark,
  },
  {
    match: ["erbol", "ербол"],
    name: "Доставка и склад",
    description: "Доставка, склад и передача товаров.",
    icon: Truck,
  },
] as const;

function roleFor(name: string) {
  const normalized = name.toLowerCase();
  return (
    ROLE_DETAILS.find((role) => role.match.some((match) => normalized.includes(match))) ?? {
      name: "Сотрудник",
      description: "Рабочие задачи сотрудника.",
      icon: Users,
    }
  );
}

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

  return <TeamCards members={members} loading={dailyLoading || tasksLoading} />;
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
  loading,
}: {
  members: ApiMember[];
  loading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <>
      <Header eyebrow="Общая работа" title="Команда" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight">Команда</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Выберите сотрудника, чтобы открыть его рабочее пространство.
          </p>

          {loading ? (
            <p className="mt-8 text-sm text-muted-foreground">Загрузка команды…</p>
          ) : members.length === 0 ? (
            <div className="mt-8 rounded-xl border border-border bg-background p-8 text-center">
              <Users className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">В команде пока нет участников.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => {
                const personName = member.fullName ?? member.email ?? "Сотрудник";
                const role = roleFor(personName);
                const Icon = role.icon;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => navigate(`/dashboard/team/${member.id}`)}
                    className="group rounded-xl border border-border bg-background p-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{personName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{role.name}</p>
                  </button>
                );
              })}
            </div>
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
  const role = roleFor(personName);
  const Icon = role.icon;
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

          <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-background p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{personName}</h2>
                <p className="mt-1 text-sm font-medium text-primary">{role.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
              </div>
            </div>
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
