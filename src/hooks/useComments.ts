import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import { api, ApiError, type ApiComment } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useComments(taskId?: string | null) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: async (): Promise<ApiComment[]> => {
      try {
        const token = await getToken();
        return await api.getComments(token, taskId!);
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
    enabled: Boolean(taskId),
    retry: false,
  });
}

export function useCreateComment(taskId?: string | null) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!taskId) throw new Error("taskId required");
      const token = await getToken();
      return api.createComment(token, taskId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      showToast(i18n.t("comments.added"), "success");
    },
    onError: () => {
      showToast(i18n.t("tasks.somethingWrong"), "error");
    },
  });
}

export function useDeleteComment(taskId?: string | null) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const token = await getToken();
      return api.deleteComment(token, commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      showToast(i18n.t("comments.deleted"), "success");
    },
    onError: () => {
      showToast(i18n.t("tasks.somethingWrong"), "error");
    },
  });
}
