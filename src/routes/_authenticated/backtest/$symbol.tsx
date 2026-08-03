import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { runBacktest } from "@/lib/forecast.functions";
import { CandlestickChartView } from "@/components/CandlestickChartView";
import { DirectionalProbability } from "@/components/DirectionalProbability";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, History, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/backtest/$symbol")({
  component: BacktestPage,
  head: ({ params }) => ({ meta: [{ title: `Backtest ${params.symbol} — Candlestick AI` }] }),
});

function BacktestPage() {
  const { symbol } = Route.useParams();
  const bt = useServerFn(runBacktest);
  const [interval, setInterval] = useState<"1d" | "1h" | "1wk">("1d");
  const defaultDate = new Date(); defaultDate.setMonth(defaultDate.getMonth() - 6);
  const [date, setDate] = useState<string>(defaultDate.toISOString().slice(0, 10));
  const [horizon, setHorizon] = useState(10);

  const mut = useMutation({
    mutationFn: () => bt({ data: { symbol, interval, anchor_time: Math.floor(new Date(date + "T15:30:00").getTime() / 1000), horizon } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Backtest fallito"),
  });

  return (
    <div className="space-y-6">
      <div>
        <Link to="/analyze/$symbol" params={{ symbol }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Torna all'analisi
        </Link>
        <h1 className="mt-1 text-2xl font-semibold flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Backtest {symbol}</h1>
        <p className="text-sm text-muted-foreground">Scegli una data passata. L'AI genererà la previsione basandosi <em>solo</em> sui dati fino a quella data, e la confronteremo con l'andamento reale successivo.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground">Data ancoraggio</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Intervallo</label>
          <select value={interval} onChange={(e) => setInterval(e.target.value as any)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="1d">Daily</option>
            <option value="1wk">Weekly</option>
            <option value="1h">1 ora</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Orizzonte (candele)</label>
          <input type="number" min={3} max={60} value={horizon} onChange={(e) => setHorizon(Math.max(3, Math.min(60, +e.target.value || 10)))} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end">
          <button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <Play className="h-4 w-4" /> {mut.isPending ? "Elaboro…" : "Esegui backtest"}
          </button>
        </div>
      </div>

      {mut.data && (
        <>
          <div className="grid gap-3 grid-cols-3">
            <Metric label="MAPE" value={`${mut.data.metrics.mape.toFixed(2)}%`} hint="Errore % medio sulle chiusure" />
            <Metric label="Errore max" value={`${mut.data.metrics.max_error.toFixed(2)}%`} />
            <Metric label="Direzione" value={mut.data.metrics.direction_correct ? "Corretta" : "Sbagliata"} valueClass={mut.data.metrics.direction_correct ? "text-bull" : "text-bear"} />
          </div>

          <CandlestickChartView
            candles={mut.data.history}
            predicted={mut.data.predicted}
            optimistic={mut.data.optimistic}
            pessimistic={mut.data.pessimistic}
            actual={mut.data.actual}
            height={480}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="mb-2 text-xs text-muted-foreground flex items-center gap-4">
                <span><span className="inline-block h-2 w-4 bg-[oklch(0.72_0.16_165)] mr-1 align-middle" />Storico reale (candele)</span>
                <span><span className="inline-block h-2 w-4 bg-[#8b78ff] mr-1 align-middle" />Previsione AI</span>
                <span><span className="inline-block h-2 w-4 bg-[#f5d90a] mr-1 align-middle" />Chiusura reale post-ancoraggio</span>
              </div>
              <p className="text-muted-foreground">{mut.data.rationale}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Probabilità direzionale stimata dall'AI (prima di conoscere il risultato)</p>
              <DirectionalProbability probability={mut.data.directionalProbability} />
              <p className="mt-3 text-xs text-muted-foreground">
                Esito reale: <span className={mut.data.metrics.direction_correct ? "text-bull font-medium" : "text-bear font-medium"}>{mut.data.metrics.direction_correct ? "direzione indovinata" : "direzione sbagliata"}</span>
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, hint, valueClass }: { label: string; value: string; hint?: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular ${valueClass ?? ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
