import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { UserPlus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useMembers } from "@/hooks/useProjects";
import { AssigneeAvatar } from "@/components/dashboard/AssigneeAvatar";
import type { ApiMember } from "@/lib/api";

export function MembersDropdown() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: members = [] } = useMembers();
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

  const list: ApiMember[] =
    members.length > 0
      ? members
      : user
        ? [
            {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              fullName: user.fullName,
              email: user.primaryEmailAddress?.emailAddress ?? null,
              imageUrl: user.imageUrl,
            },
          ]
        : [];

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <Users className="h-3.5 w-3.5" />
        {t("common.members")}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-background py-2 shadow-lg">
          <p className="px-4 py-2 text-xs font-medium text-muted-foreground">{t("members.title")}</p>
          <div className="max-h-64 overflow-y-auto">
            {list.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-2">
                <AssigneeAvatar
                  userId={member.id}
                  members={list}
                  currentUserId={user?.id}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.fullName ?? member.email ?? member.id}
                  </p>
                  {member.id === user?.id && (
                    <p className="truncate text-xs text-muted-foreground">{t("members.you")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
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
