import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { avatarColorForUserId, initialsFromUser } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

export function MembersDropdown() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const initials = initialsFromUser(
    user?.firstName,
    user?.lastName,
    user?.primaryEmailAddress?.emailAddress,
  );
  const color = user?.id ? avatarColorForUserId(user.id) : "bg-indigo-400";

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <Users className="h-3.5 w-3.5" />
        {t("common.members")}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-background py-2 shadow-lg">
          <p className="px-4 py-2 text-xs font-medium text-muted-foreground">{t("members.title")}</p>
          {user && (
            <div className="flex items-center gap-3 px-4 py-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
                  color,
                )}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.fullName ?? user.primaryEmailAddress?.emailAddress}
                </p>
                <p className="truncate text-xs text-muted-foreground">{t("members.you")}</p>
              </div>
            </div>
          )}
          <div className="border-t border-border px-4 py-3">
            <Button variant="outline" size="sm" className="w-full" disabled>
              <UserPlus className="h-3.5 w-3.5" />
              {t("members.inviteSoon")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
