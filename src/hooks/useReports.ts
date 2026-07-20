import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { ReportPeriod } from "@/lib/report-utils";

export function useReports(
  period: ReportPeriod,
  options?: { projectId?: string; anchor?: string },
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["reports", period, options?.projectId, options?.anchor],
    queryFn: async () => {
      const token = await getToken();
      return api.getReportSummary(token, {
        period,
        projectId: options?.projectId,
        anchor: options?.anchor,
      });
    },
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return count < 1;
    },
  });
}

export function useQuarterlyReport() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["reports", "quarter"],
    queryFn: async () => {
      const token = await getToken();
      return api.getReportSummary(token, { period: "quarter" });
    },
    retry: false,
  });
}
