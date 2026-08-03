import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPredictions, evaluatePrediction, deletePrediction, getPredictionStats } from "@/lib/forecast.functions";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Trash2, RefreshCw, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/predictions")({
  component: PredictionsPage,
  head: () => ({ meta: [{ title: "Previsioni salvate — Candlestick AI" }] }),
});

interface Eval { direction_correct: boolean | null; mape: number | null; max_error: number | null; }

function PredictionsPage() {
  const listP = useServerFn(listPredictions);
  const evalFn = useServerFn(evaluatePrediction);
  const delFn = useServerFn(deletePrediction);
  const statsFn = useServerFn(getPredictionStats);
  const qc = useQueryClient();
  const preds = useQuery({ queryKey: ["predictions"], queryFn: () => listP() });
  const stats = useQuery({ queryKey: ["prediction-stats"], queryFn: () => statsFn() });

  const evalMut = useMutation({
    mutationFn: (id: string) => evalFn({ data: { prediction_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions"] });
      qc.invalidateQueries({ queryKey: ["prediction-stats"] });
      toast.success("Valutato");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore valutazione"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Previsioni salvate</h1>
        <p className="text-sm text-muted-foreground">Ogni previsione può essere valutata a posteriori confrontando le candele previste con quelle reali successive.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Affidabilità storica (basata sui backtest già valutati)</h2>
        {stats.isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : !stats.data || stats.data.evaluated === 0 ? (
          <p className="text-sm text-muted-foreground">Ancora nessuna previsione valutata — usa "Valuta" qui sotto o prova qualche backtest per iniziare a costruire uno storico reale, invece di fidarti a scatola chiusa.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Previsioni valutate</div>
              <div className="text-xl font-semibold tabular">{stats.data.evaluated}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Direzione indovinata</div>
              <div className="text-xl font-semibold tabular">
                {stats.data.directionAccuracy != null ? `${Math.round(stats.data.directionAccuracy * 100)}%` : "—"}
                <span className="ml-1 text-xs font-normal text-muted-foreground">({stats.data.directionCorrect}/{stats.data.evaluated})</span>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Errore medio (MAPE)</div>
              <div className="text-xl font-semibold tabular">{stats.data.avgMape != null ? `${stats.data.avgMape.toFixed(2)}%` : "—"}</div>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Il 50% di direzione indovinata equivale a un lancio di moneta — è il punto di riferimento minimo per capire se l'AI sta facendo qualcosa di utile o no su questo tipo di dati.
        </p>
      </div>

      {preds.isLoading && <div className="text-sm text-muted-foreground">Caricamento…</div>}
      {preds.data && preds.data.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nessuna previsione salvata. Vai su un titolo e clicca "Salva".
        </div>
      )}

      <div className="space-y-3">
        {(preds.data ?? []).map((p: any) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Link to="/analyze/$symbol" params={{ symbol: p.symbol }} className="font-semibold hover:underline">{p.symbol}</Link>
                  <span className="text-xs text-muted-foreground">{p.interval} · {p.horizon_candles} candele · {new Date(p.made_at).toLocaleString("it-IT")}</span>
                </div>
                {p.rationale && <p className="mt-1 text-xs text-muted-foreground max-w-3xl line-clamp-2">{p.rationale}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => evalMut.mutate(p.id)} disabled={evalMut.isPending} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent"><RefreshCw className="h-3 w-3" /> Valuta</button>
                <Link to="/analyze/$symbol" params={{ symbol: p.symbol }} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground">Vai <ArrowRight className="h-3 w-3" /></Link>
                <button onClick={() => delMut.mutate(p.id)} className="inline-flex items-center rounded-md p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            {evalMut.data && evalMut.variables === p.id && (
              <EvalResult ev={evalMut.data as any} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvalResult({ ev }: { ev: any }) {
  if (ev.pending) return <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Storico successivo non ancora disponibile.</div>;
  return (
    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
      <div className="rounded-md border border-border/60 p-2">
        <div className="text-muted-foreground">Direzione</div>
        <div className={`font-semibold flex items-center gap-1 ${ev.direction_correct ? "text-bull" : "text-bear"}`}>
          {ev.direction_correct ? <><CheckCircle2 className="h-3.5 w-3.5" /> Corretta</> : <><XCircle className="h-3.5 w-3.5" /> Sbagliata</>}
        </div>
      </div>
      <div className="rounded-md border border-border/60 p-2"><div className="text-muted-foreground">MAPE</div><div className="tabular font-semibold">{ev.mape?.toFixed(2)}%</div></div>
      <div className="rounded-md border border-border/60 p-2"><div className="text-muted-foreground">Errore max</div><div className="tabular font-semibold">{ev.max_error?.toFixed(2)}%</div></div>
    </div>
  );
}
