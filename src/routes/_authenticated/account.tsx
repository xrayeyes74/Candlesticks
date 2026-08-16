import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { deleteAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "Account — Candlestick AI" }] }),
});

function AccountPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const delFn = useServerFn(deleteAccount);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const delMut = useMutation({
    mutationFn: () => delFn(),
    onSuccess: async () => {
      await supabase.auth.signOut();
      toast.success(t("account.deleted"));
      router.navigate({ to: "/", replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.error")),
  });

  const canConfirm = confirmText.trim().toLowerCase() === email.toLowerCase() && email !== "";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> {t("nav.dashboard")}</Link>
        <h1 className="mt-1 text-2xl font-semibold">{t("account.title")}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <label className="text-xs text-muted-foreground">Email</label>
        <p className="mt-1 text-sm">{email || "…"}</p>
      </div>

      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="font-semibold text-sm">{t("account.dangerZone")}</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("account.deleteWarning")}</p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> {t("account.deleteButton")}
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="text-xs text-muted-foreground">{t("account.confirmPrompt", { email })}</label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={email}
              className="w-full rounded-md border border-destructive/40 bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => delMut.mutate()}
                disabled={!canConfirm || delMut.isPending}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-40"
              >
                {delMut.isPending ? t("common.loading") : t("account.deletePermanently")}
              </button>
              <button onClick={() => { setShowConfirm(false); setConfirmText(""); }} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
