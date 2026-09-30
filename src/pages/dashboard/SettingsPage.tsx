import { ExternalLink, Package } from "lucide-react";
import { useState } from "react";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { avatarColorForUserId, initialsFromUser } from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import {
  getEnabledOptionalModules,
  OPTIONAL_MODULES,
  setOptionalModuleEnabled,
} from "@/lib/optional-modules";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [enabledModules, setEnabledModules] = useState(
    () => new Set(getEnabledOptionalModules()),
  );

  const toggleModule = (id: (typeof OPTIONAL_MODULES)[number]["id"]) => {
    const enabled = !enabledModules.has(id);
    setOptionalModuleEnabled(id, enabled);
    setEnabledModules((current) => {
      const next = new Set(current);
      if (enabled) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const initials = initialsFromUser(
    user?.firstName,
    user?.lastName,
    user?.primaryEmailAddress?.emailAddress,
  );
  const color = user?.id ? avatarColorForUserId(user.id) : "bg-primary";

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
        <div>
          <p className="text-xs text-muted-foreground">{t("settings.account")}</p>
          <h1 className="text-base font-semibold">{t("settings.title")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-lg space-y-6">
          <section className="rounded-lg border border-border bg-background p-5">
            <h2 className="mb-4 text-sm font-semibold">{t("settings.profile")}</h2>
            {user && (
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white",
                    color,
                  )}
                >
                  {initials}
                </div>
                <div>
                  <p className="font-medium">{user.fullName ?? t("common.user")}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    ID: {user.id.slice(0, 12)}вЂ¦
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-background p-5">
            <h2 className="mb-2 text-sm font-semibold">{t("common.language")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
            <LanguageSwitcher />
          </section>

          <section className="rounded-lg border border-border bg-background p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Modules</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add only the tools you want in your dashboard sidebar.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {OPTIONAL_MODULES.map((module) => {
                const enabled = enabledModules.has(module.id);
                return (
                  <div
                    key={module.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{module.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleModule(module.id)}
                      className={cn(
                        "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        enabled
                          ? "bg-muted text-foreground hover:bg-muted/80"
                          : "bg-primary text-white hover:bg-primary/90",
                      )}
                    >
                      {enabled ? "Remove" : "Add module"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-5">
            <h2 className="mb-2 text-sm font-semibold">{t("settings.accountManagement")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t("settings.accountDesc")}</p>
            <a
              href="https://accounts.clerk.com/user"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary"
            >
              {t("settings.openPortal")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>

          <section className="rounded-lg border border-border bg-background p-5">
            <h2 className="mb-2 text-sm font-semibold">{t("settings.about")}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.aboutDesc")}</p>
          </section>
        </div>
      </div>
    </>
  );
}
