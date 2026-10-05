import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ApiMileageEntry } from "@/lib/api";

function monthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return {
    from: format(new Date(year, month, 1)),
    to: format(new Date(year, month + 1, 0)),
  };
}

export function useMyMileageEntries(enabled = true) {
  const { getToken } = useAuth();
  const range = monthRange();

  return useQuery({
    queryKey: ["mileage", "mine", range.from, range.to],
    queryFn: async (): Promise<ApiMileageEntry[]> =>
      api.getMyMileageEntries(await getToken(), range.from, range.to),
    enabled,
    retry: false,
  });
}

export function useCreateMileageEntry() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { entryDate: string; kilometers: number; ratePerKm: number; note?: string }) => {
      return api.createMileageEntry(await getToken(), data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mileage", "mine"] }),
  });
}

export function useDeleteMileageEntry() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.deleteMileageEntry(await getToken(), id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mileage", "mine"] }),
  });
}
