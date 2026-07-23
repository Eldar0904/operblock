import { useTranslation } from "react-i18next";

interface DateTimeFieldProps {
  value: string;
  onChange: (iso: string) => void;
}

/** Converts ISO string to datetime-local input value (local timezone). */
function toLocalInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parses datetime-local value to ISO string. */
function fromLocalInputValue(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function DateTimeField({ value, onChange }: DateTimeFieldProps) {
  const { t } = useTranslation();

  return (
    <input
      type="datetime-local"
      value={toLocalInputValue(value)}
      onChange={(e) => onChange(fromLocalInputValue(e.target.value))}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      aria-label={t("tasks.dueDate")}
    />
  );
}

export function formatDueDateDisplay(iso: string | null | undefined, locale?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
