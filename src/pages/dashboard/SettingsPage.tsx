import { ExternalLink } from "lucide-react";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { NotificationsDropdown } from "@/components/dashboard/NotificationsDropdown";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { avatarColorForUserId, initialsFromUser } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useUser();

  const initials = initialsFromUser(
    user?.firstName,
    user?.lastName,
    user?.primaryEmailAddress?.emailAddress,
  );
  const color = user?.id ? avatarColorForUserId(user.id) : "bg-indigo-400";

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
                    ID: {user.id.slice(0, 12)}…
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
            <h2 className="mb-2 text-sm font-semibold">{t("settings.accountManagement")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t("settings.accountDesc")}</p>
            <a
              href="https://accounts.clerk.com/user"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
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
