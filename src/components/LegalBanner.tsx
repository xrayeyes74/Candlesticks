import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

export function LegalBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-400">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{t("common.legalBanner")}</span>
    </div>
  );
}
