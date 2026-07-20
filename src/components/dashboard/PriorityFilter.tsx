import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/mock-data";

interface PriorityFilterProps {
  value: Priority | "all";
  onChange: (value: Priority | "all") => void;
}

export function PriorityFilter({ value, onChange }: PriorityFilterProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options: { value: Priority | "all"; label: string }[] = [
    { value: "all", label: t("priority.all") },
    { value: "low", label: t("priority.low") },
    { value: "medium", label: t("priority.medium") },
    { value: "high", label: t("priority.high") },
  ];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const label = options.find((o) => o.value === value)?.label ?? t("common.filter");

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <Filter className="h-3.5 w-3.5" />
        {value === "all" ? t("common.filter") : label}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border border-border bg-background py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-4 py-2 text-left text-sm hover:bg-accent",
                value === opt.value && "bg-indigo-50 font-medium text-indigo-700",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
