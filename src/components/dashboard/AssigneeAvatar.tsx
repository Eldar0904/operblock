import { cn } from "@/lib/utils";
import type { ApiMember } from "@/lib/api";
import { avatarColorForUserId, initialsFromUser } from "@/lib/task-utils";

export function resolveAssignee(
  userId: string | null | undefined,
  members: ApiMember[],
  currentUserId?: string | null,
): { initials: string; color: string; label: string } | null {
  if (!userId) return null;

  const member = members.find((m) => m.id === userId);
  if (member) {
    return {
      initials: initialsFromUser(member.firstName, member.lastName, member.email),
      color: avatarColorForUserId(userId),
      label:
        member.fullName ||
        member.email ||
        (userId === currentUserId ? "You" : userId.slice(0, 8)),
    };
  }

  return {
    initials: userId.slice(-2).toUpperCase(),
    color: avatarColorForUserId(userId),
    label: userId === currentUserId ? "You" : `${userId.slice(0, 8)}…`,
  };
}

interface AssigneeAvatarProps {
  userId?: string | null;
  members: ApiMember[];
  currentUserId?: string | null;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function AssigneeAvatar({
  userId,
  members,
  currentUserId,
  size = "sm",
  showLabel = false,
  className,
}: AssigneeAvatarProps) {
  const resolved = resolveAssignee(userId, members, currentUserId);
  if (!resolved) {
    return showLabel ? (
      <span className={cn("text-sm text-muted-foreground", className)}>—</span>
    ) : null;
  }

  const sizeClass = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
          sizeClass,
          resolved.color,
        )}
        title={resolved.label}
      >
        {resolved.initials}
      </div>
      {showLabel && <span className="truncate text-sm">{resolved.label}</span>}
    </div>
  );
}
