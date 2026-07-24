import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import { api, ApiError, type ApiAttachment } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export function useAttachments(taskId?: string | null) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["attachments", taskId],
    queryFn: async (): Promise<ApiAttachment[]> => {
      try {
        const token = await getToken();
        return await api.getAttachments(token, taskId!);
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

export function useUploadAttachment(taskId?: string | null) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!taskId) throw new Error("taskId required");
      const token = await getToken();
      return api.uploadAttachment(token, taskId, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
      showToast(i18n.t("attachments.uploaded"), "success");
    },
    onError: (err) => {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : i18n.t("tasks.somethingWrong");
      showToast(message, "error");
    },
  });
}

export function useDownloadAttachment() {
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ id, fileName }: { id: string; fileName: string }) => {
      const token = await getToken();
      await api.downloadAttachment(token, id, fileName);
    },
    onError: () => {
      showToast(i18n.t("tasks.somethingWrong"), "error");
    },
  });
}

export function useDeleteAttachment(taskId?: string | null) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const token = await getToken();
      return api.deleteAttachment(token, attachmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
      showToast(i18n.t("attachments.deleted"), "success");
    },
    onError: () => {
      showToast(i18n.t("tasks.somethingWrong"), "error");
    },
  });
}
