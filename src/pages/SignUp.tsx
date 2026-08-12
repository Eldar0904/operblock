import { Link } from "react-router-dom";
import { SignUp } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { useMembers } from "@/hooks/useProjects";
import { PineLogo } from "@/components/PineLogo";

export default function SignUpPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMembers();
  const teamFull = data?.teamFull ?? false;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link to="/" className="mb-8 flex flex-col items-center gap-2">
        <PineLogo className="h-12" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">OperBlock</span>
      </Link>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : teamFull ? (
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <h1 className="text-base font-semibold">{t("members.teamFullTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("members.teamFullSignup")}</p>
          <Link to="/sign-in" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            {t("landing.logIn")}
          </Link>
        </div>
      ) : (
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      )}
    </div>
  );
}
