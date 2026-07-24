import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

/** Upload files queued during task create (after the task exists). */
export function useUploadPendingAttachments() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();

  return async (taskId: string, files: File[] | undefined) => {
    if (!files?.length) return;
    try {
      const token = await getToken();
      for (const file of files) {
        await api.uploadAttachment(token, taskId, file);
      }
    } catch {
      showToast(t("attachments.uploadAfterCreateFailed"), "error");
    }
  };
}
