import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { ApiPortfolio } from "@/lib/mock-data";

export function usePortfolios() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["portfolios"],
    queryFn: async (): Promise<ApiPortfolio[]> => {
      try {
        const token = await getToken();
        return await api.getPortfolios(token);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 503 || err.status >= 500)) {
          return [];
        }
        if (err instanceof TypeError) {
          return [];
        }
        throw err;
      }
    },
    retry: false,
  });
}

export function useCreatePortfolio() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const token = await getToken();
      return api.createPortfolio(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

export function useUpdatePortfolio() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const token = await getToken();
      return api.updatePortfolio(token, id, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });
}

export function useDeletePortfolio() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.deletePortfolio(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
