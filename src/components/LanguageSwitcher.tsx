import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n, t } = useTranslation();

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <Languages className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        aria-label={t("language.label")}
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}
