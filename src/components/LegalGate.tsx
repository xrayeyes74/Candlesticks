import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const STORAGE_KEY = "candlestick-legal-accepted-v1";

export function LegalGate() {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : "1";
    setAccepted(stored === "1");
  }, []);

  if (accepted) return null;

  function accept() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setAccepted(true);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="max-w-lg rounded-xl border border-yellow-500/40 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <h2 className="font-semibold">{t("common.legalTitle")}</h2>
          </div>
          <LanguageSwitcher />
        </div>
        <p className="text-sm font-semibold leading-relaxed">{t("common.legalBody")}</p>
        <label className="mt-5 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
          <span>{t("common.legalAccept")}</span>
        </label>
        <button
          onClick={accept}
          disabled={!checked}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
        >
          {t("common.confirm")}
        </button>
      </div>
    </div>
  );
}