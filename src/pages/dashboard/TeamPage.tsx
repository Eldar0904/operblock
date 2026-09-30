import {
  ArrowLeft,
  ArrowUpRight,
  Files,
  Landmark,
  MessagesSquare,
  Truck,
  Code2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";

type WorkspaceId =
  | "it"
  | "reception"
  | "staff-documents"
  | "chief-office"
  | "delivery-warehouse";

type TeamWorkspace = {
  id: WorkspaceId;
  name: string;
  group: "IT Department" | "Office" | "Operations";
  members: string[];
  summary: string;
  icon: typeof Code2;
  sections: Array<{ title: string; description: string }>;
};

const WORKSPACES: TeamWorkspace[] = [
  {
    id: "it",
    name: "IT Department",
    group: "IT Department",
    members: ["Eldar", "Aidar"],
    summary: "Shared development work, technical decisions, releases, and internal support.",
    icon: Code2,
    sections: [
      { title: "Development queue", description: "Shared priorities for Eldar and Aidar." },
      { title: "Technical decisions", description: "Architecture, credentials, links, and decisions." },
      { title: "Release & support", description: "What is ready, deployed, or needs attention." },
    ],
  },
  {
    id: "reception",
    name: "Reception",
    group: "Office",
    members: ["Zulhiya"],
    summary: "Visitors, calls, incoming requests, and clear hand-offs.",
    icon: MessagesSquare,
    sections: [
      { title: "Incoming requests", description: "Visitors, calls, messages, and who should respond." },
      { title: "Today's hand-offs", description: "Requests passed to the right department." },
      { title: "Reception notes", description: "Useful context kept out of personal task boards." },
    ],
  },
  {
    id: "staff-documents",
    name: "Staff & Documents",
    group: "Office",
    members: ["Sandu"],
    summary: "Staff requests, operational documents, and the current approved records.",
    icon: Files,
    sections: [
      { title: "Document register", description: "What arrived, is pending, or is complete." },
      { title: "Staff requests", description: "Follow-up items with a clear owner." },
      { title: "Templates & records", description: "The approved, current source for the office." },
    ],
  },
  {
    id: "chief-office",
    name: "Chief's Office",
    group: "Operations",
    members: ["Nurbek"],
    summary: "Executive briefs, delegated work, decisions, and follow-through.",
    icon: Landmark,
    sections: [
      { title: "Decision follow-up", description: "What was agreed and the next responsible person." },
      { title: "Executive briefs", description: "A short, current view for the Chief." },
      { title: "Delegated work", description: "Cross-team requests that need a response." },
    ],
  },
  {
    id: "delivery-warehouse",
    name: "Delivery & Warehouse",
    group: "Operations",
    members: ["Erbol"],
    summary: "Deliveries, warehouse status, stock exceptions, and proof of hand-off.",
    icon: Truck,
    sections: [
      { title: "Today's deliveries", description: "What is leaving, arriving, or delayed." },
      { title: "Warehouse status", description: "Receiving, stock, and exceptions." },
      { title: "Proof & hand-off", description: "Completed delivery records and confirmations." },
    ],
  },
];

export default function TeamPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: WorkspaceId }>();
  const activeWorkspace = WORKSPACES.find((workspace) => workspace.id === workspaceId);

  if (workspaceId && activeWorkspace) {
    return <WorkspacePage workspace={activeWorkspace} onBack={() => navigate("/dashboard/team")} />;
  }

  return <TeamMap onOpen={(id) => navigate(`/dashboard/team/${id}`)} />;
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

function TeamMap({ onOpen }: { onOpen: (id: WorkspaceId) => void }) {
  const groups = ["IT Department", "Office", "Operations"] as const;

  return (
    <>
      <Header eyebrow="Shared workspaces" title="Team" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-semibold tracking-tight">Work is organized by responsibility.</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            My Work stays personal. These spaces hold the shared information and work for each department.
          </p>

          <div className="mt-8 space-y-7">
            {groups.map((group) => {
              const workspaces = WORKSPACES.filter((workspace) => workspace.group === group);
              return (
                <section key={group}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {workspaces.map((workspace) => {
                      const Icon = workspace.icon;
                      return (
                        <button
                          key={workspace.id}
                          type="button"
                          onClick={() => onOpen(workspace.id)}
                          className="group rounded-xl border border-border bg-background p-5 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" />
                            </div>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </div>
                          <h4 className="mt-4 font-semibold">{workspace.name}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{workspace.summary}</p>
                          <p className="mt-4 text-xs font-medium text-primary">{workspace.members.join(" · ")}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}

function WorkspacePage({
  workspace,
  onBack,
}: {
  workspace: TeamWorkspace;
  onBack: () => void;
}) {
  const Icon = workspace.icon;

  return (
    <>
      <Header eyebrow="Team / shared workspace" title={workspace.name} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Team
          </button>

          <section className="rounded-xl border border-border bg-background p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{workspace.name}</h2>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{workspace.summary}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {workspace.members.map((member) => (
                  <span key={member} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                    {member}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {workspace.sections.map((section) => (
              <section key={section.title} className="rounded-xl border border-border bg-background p-5">
                <h3 className="font-semibold">{section.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
