export const TERMINAL_TASK_STATUSES = ["done", "paused", "canceled"] as const;
export const REPORT_CLOSED_STATUSES = TERMINAL_TASK_STATUSES;

export type TerminalTaskStatus = (typeof TERMINAL_TASK_STATUSES)[number];

export function isTerminalTaskStatus(status: string): boolean {
  return (TERMINAL_TASK_STATUSES as readonly string[]).includes(status);
}

export function stampsCompletedAt(nextStatus: string, prevStatus: string): Date | null | undefined {
  const nextTerminal = isTerminalTaskStatus(nextStatus);
  const prevTerminal = isTerminalTaskStatus(prevStatus);
  if (nextTerminal && !prevTerminal) return new Date();
  if (!nextTerminal && prevTerminal) return null;
  return undefined;
}
