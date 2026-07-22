import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Landing() {
  const { t } = useTranslation();

  const previewColumns = [
    {
      title: t("landing.previewTodo"),
      color: "bg-slate-100",
      tasks: [
        { title: t("previewTasks.designAudit"), tag: t("tags.design"), done: false, active: false },
        { title: t("previewTasks.updateCopy"), tag: t("tags.marketing"), done: false, active: false },
      ],
    },
    {
      title: t("landing.previewInProgress"),
      color: "bg-indigo-50",
      tasks: [
        { title: t("previewTasks.buildKanban"), tag: t("tags.engineering"), done: false, active: true },
      ],
    },
    {
      title: t("landing.previewDone"),
      color: "bg-emerald-50",
      tasks: [
        { title: t("previewTasks.kickoff"), tag: t("tags.planning"), done: true, active: false },
      ],
    },
  ];

  const features = [
    { title: t("landing.featureKanbanTitle"), description: t("landing.featureKanbanDesc") },
    { title: t("landing.featureTeamTitle"), description: t("landing.featureTeamDesc") },
    { title: t("landing.featureScaleTitle"), description: t("landing.featureScaleDesc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">{t("company")}</span>
            <span className="text-xs font-medium text-muted-foreground">{t("brand")}</span>
          </Link>
          <nav className="flex items-center gap-3">
            <LanguageSwitcher variant="buttons" />
            <Link to="/sign-up">
              <Button>
                {t("landing.getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/sign-in">
              <Button variant="ghost">{t("landing.logIn")}</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t("landing.heroTitle")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              {t("landing.heroSubtitle")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/sign-up">
                <Button size="lg">
                  {t("landing.getStarted")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/sign-in">
                <Button size="lg" variant="outline">
                  {t("landing.logIn")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-4xl">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-muted-foreground">{t("landing.boardPreview")}</span>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                {previewColumns.map((column) => (
                  <div key={column.title} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">{column.title}</h3>
                      <span className="text-xs text-muted-foreground">{column.tasks.length}</span>
                    </div>
                    <div className={`rounded-lg p-3 ${column.color}`}>
                      <div className="space-y-2">
                        {column.tasks.map((task) => (
                          <div
                            key={task.title}
                            className={`rounded-md border bg-background p-3 shadow-sm ${
                              task.active ? "border-indigo-200 ring-1 ring-indigo-100" : "border-border"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {task.done ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              ) : (
                                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{task.title}</p>
                                <span className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                                  {task.tag}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-8 sm:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {t("company")}</span>
          <span>Built for high-performance teams.</span>
        </div>
      </footer>
    </div>
  );
}
