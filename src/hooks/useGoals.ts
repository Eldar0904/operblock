import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import { api, ApiError, type ApiGoal } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useGoals() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["goals"],
    queryFn: async (): Promise<ApiGoal[]> => {
      try {
        const token = await getToken();
        return await api.getGoals(token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
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

export function useCreateGoal() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data: { title: string; description?: string; projectIds?: string[] }) => {
      const token = await getToken();
      return api.createGoal(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      showToast(i18n.t("goals.created"), "success");
    },
    onError: () => showToast(i18n.t("tasks.somethingWrong"), "error"),
  });
}

export function useUpdateGoal() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string | null;
      projectIds?: string[];
    }) => {
      const token = await getToken();
      return api.updateGoal(token, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      showToast(i18n.t("goals.updated"), "success");
    },
    onError: () => showToast(i18n.t("tasks.somethingWrong"), "error"),
  });
}

export function useDeleteGoal() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return api.deleteGoal(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      showToast(i18n.t("goals.deleted"), "success");
    },
    onError: () => showToast(i18n.t("tasks.somethingWrong"), "error"),
  });
}
