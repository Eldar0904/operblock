import { FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FilesView() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-indigo-50 p-4">
        <FolderOpen className="h-8 w-8 text-indigo-600" />
      </div>
      <h3 className="text-base font-semibold">{t("files.comingSoonTitle")}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("files.comingSoonDesc")}</p>
    </div>
  );
}
