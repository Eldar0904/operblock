import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ThroughputChartProps {
  data: { bucket: string; count: number }[];
}

export function ThroughputChart({ data }: ThroughputChartProps) {
  const { t } = useTranslation();
  const max = Math.max(...data.map((d) => d.count), 1);

  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-background text-sm text-muted-foreground">
        {t("reports.noCompletions")}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <h3 className="mb-4 text-sm font-semibold">{t("reports.throughput")}</h3>
      <div className="flex h-40 items-end gap-2">
        {data.map((item) => (
          <div key={item.bucket} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-medium text-foreground">{item.count}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-t-md bg-indigo-500 transition-all",
                  item.count === 0 && "bg-muted",
                )}
                style={{
                  height: `${Math.max((item.count / max) * 100, item.count > 0 ? 8 : 0)}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{item.bucket}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
