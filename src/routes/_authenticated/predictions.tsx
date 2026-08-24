import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchActualCandles } from "@/lib/forecast.functions";
import { getPredictions, deletePredictionLocal, saveEvaluation, getPredictionStatsLocal } from "@/lib/local-storage";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Clock, Trash2, RefreshCw, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/predictions")({
  component: PredictionsPage,
  head: () => ({ meta: [{ title: "Previsioni salvate — Candlestick AI" }] }),
});

function PredictionsPage() {
  const { t, i18n } = useTranslation();
  const fetchActual = useServerFn(fetchActualCandles);
  const qc = useQueryClient();
  const preds = useQuery({ queryKey: ["predictions"], queryFn: () => getPredictions() });
  const stats = useQuery({ queryKey: ["prediction-stats"], queryFn: () => getPredictionStatsLocal() });

  const evalMut = useMutation({
    mutationFn: async (id: string) => {
      const pred = getPredictions().find((p) => p.id === id);
      if (!pred) throw new Error("Not found");
      const { actual } = await fetchActual({
        data: { symbol: pred.symbol, interval: pred.interval, anchor_time: pred.anchor_time, horizon_candles: pred.horizon_candles },
      });
      if (actual.length === 0) {
        const evaluation = { direction_correct: null, mape: null, max_error: null, actual_candles: [], evaluated_at: new Date().toISOString() };
        return { id, evaluation, pending: true };
      }
      const predicted = pred.predicted_candles;
      const n = Math.min(predicted.length, actual.length);
      let sumPct = 0, maxErr = 0;
      for (let i = 0; i < n; i++) {
        const err = Math.abs(actual[i].close - predicted[i].close) / actual[i].close;
        sumPct += err;
        if (err > maxErr) maxErr = err;
      }
      const mape = (sumPct / n) * 100;
            const predDir = predicted[predicted.length - 1].close - pred.anchor_close;
      const actDir = actual[actual.length - 1].close - pred.anchor_close;
      const direction_correct = Math.sign(predDir) === Math.sign(actDir);
      const evaluation = { direction_correct, mape, max_error: maxErr * 100, actual_candles: actual, evaluated_at: new Date().toISOString() };
      saveEvaluation(id, evaluation);
      return { id, evaluation, pending: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions"] });
      qc.invalidateQueries({ queryKey: ["prediction-stats"] });
      toast.success(t("predictions.evaluated_toast"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("predictions.evaluationError")),
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => deletePredictionLocal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("predictions.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("predictions.subtitle")}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("predictions.statsTitle")}</h2>
        {stats.isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : !stats.data || stats.data.evaluated === 0 ? (
          <p className="text-sm text-muted-foreground">{t("predictions.statsEmpty")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{t("predictions.evaluated")}</div>
              <div className="text-xl font-semibold tabular">{stats.data.evaluated}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{t("predictions.directionAccuracy")}</div>
              <div className="text-xl font-semibold tabular">
                {stats.data.directionAccuracy != null ? `${Math.round(stats.data.directionAccuracy * 100)}%` : "—"}
                <span className="ml-1 text-xs font-normal text-muted-foreground">({stats.data.directionCorrect}/{stats.data.evaluated})</span>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{t("predictions.avgMape")}</div>
              <div className="text-xl font-semibold tabular">{stats.data.avgMape != null ? `${stats.data.avgMape.toFixed(2)}%` : "—"}</div>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          {t("predictions.coinFlipHint")}
        </p>
      </div>

      {preds.isLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
      {preds.data && preds.data.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("predictions.empty")}
        </div>
      )}

      <div className="space-y-3">
        {(preds.data ?? []).map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Link to="/analyze/$symbol" params={{ symbol: p.symbol }} className="font-semibold hover:underline">{p.symbol}</Link>
                  <span className="text-xs text-muted-foreground">{p.interval} · {p.horizon_candles} {t("dashboard.candles")} · {new Date(p.made_at).toLocaleString(i18n.language)}</span>
                </div>
                {p.rationale && <p className="mt-1 text-xs text-muted-foreground max-w-3xl line-clamp-2">{p.rationale}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => evalMut.mutate(p.id)} disabled={evalMut.isPending} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent"><RefreshCw className="h-3 w-3" /> {t("predictions.evaluate")}</button>
                <Link to="/analyze/$symbol" params={{ symbol: p.symbol }} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground">{t("common.goTo")} <ArrowRight className="h-3 w-3" /></Link>
                <button onClick={() => delMut.mutate(p.id)} className="inline-flex items-center rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            {p.evaluation && <EvalResult ev={p.evaluation} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvalResult({ ev }: { ev: NonNullable<ReturnType<typeof getPredictions>[number]["evaluation"]> }) {
  const { t } = useTranslation();
  if (ev.direction_correct === null) return <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {t("predictions.pendingHistory")}</div>;
  return (
    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
      <div className="rounded-md border border-border/60 p-2">
        <div className="text-muted-foreground">{t("predictions.direction")}</div>
        <div className={`font-semibold flex items-center gap-1 ${ev.direction_correct ? "text-bull" : "text-bear"}`}>
          {ev.direction_correct ? <><CheckCircle2 className="h-3.5 w-3.5" /> {t("backtest.correct")}</> : <><XCircle className="h-3.5 w-3.5" /> {t("backtest.wrong")}</>}
        </div>
      </div>
      <div className="rounded-md border border-border/60 p-2"><div className="text-muted-foreground">MAPE</div><div className="tabular font-semibold">{ev.mape?.toFixed(2)}%</div></div>
      <div className="rounded-md border border-border/60 p-2"><div className="text-muted-foreground">{t("backtest.maxError")}</div><div className="tabular font-semibold">{ev.max_error?.toFixed(2)}%</div></div>
    </div>
  );
}
