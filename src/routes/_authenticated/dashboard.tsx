import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWatchlist, addWatchlist, removeWatchlist, listPredictions } from "@/lib/forecast.functions";
import { searchSymbols } from "@/lib/market.functions";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Plus, X, TrendingUp, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Candlestick AI" }] }),
});

function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const listWl = useServerFn(listWatchlist);
  const addWl = useServerFn(addWatchlist);
  const rmWl = useServerFn(removeWatchlist);
  const listPr = useServerFn(listPredictions);
  const search = useServerFn(searchSymbols);

  const wl = useQuery({ queryKey: ["watchlist"], queryFn: () => listWl() });
  const preds = useQuery({ queryKey: ["predictions"], queryFn: () => listPr() });

  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  async function runSearch(v: string) {
    setQ(v);
    if (v.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await search({ data: { q: v } });
      setResults(r.quotes);
    } finally { setSearching(false); }
  }

  const addM = useMutation({
    mutationFn: (symbol: string) => addWl({ data: { symbol } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["watchlist"] }); toast.success("Aggiunto alla watchlist"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });
  const rmM = useMutation({
    mutationFn: (symbol: string) => rmWl({ data: { symbol } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Ciao 👋</h1>
        <p className="text-sm text-muted-foreground">Cerca un titolo, aprilo e chiedi una previsione all'AI.</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <label className="text-xs text-muted-foreground">Cerca titolo (ticker o nome)</label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => runSearch(e.target.value)} placeholder="AAPL, Tesla, ENI.MI ..." className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2.5 text-sm" />
        </div>
        {q && (
          <div className="mt-3 divide-y divide-border/60">
            {searching && <div className="py-2 text-sm text-muted-foreground">Cerco...</div>}
            {!searching && results.length === 0 && <div className="py-2 text-sm text-muted-foreground">Nessun risultato</div>}
            {results.map((r) => (
              <div key={r.symbol} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-sm">{r.symbol} <span className="text-xs text-muted-foreground">{r.exchange}</span></div>
                  <div className="text-xs text-muted-foreground">{r.longname || r.shortname}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => addM.mutate(r.symbol)} className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"><Plus className="inline h-3 w-3 mr-1" />Salva</button>
                  <button onClick={() => router.navigate({ to: "/analyze/$symbol", params: { symbol: r.symbol } })} className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">Analizza <ArrowRight className="inline h-3 w-3 ml-1" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">La tua watchlist</h2>
        {wl.isLoading ? <div className="text-sm text-muted-foreground">Caricamento…</div> :
          !wl.data || wl.data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Ancora vuota. Cerca un titolo qui sopra e salvalo.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {wl.data.map((w) => (
                <div key={w.id} className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition">
                  <button onClick={() => rmM.mutate(w.symbol)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-destructive/20"><X className="h-3.5 w-3.5" /></button>
                  <Link to="/analyze/$symbol" params={{ symbol: w.symbol }} className="block">
                    <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><span className="font-semibold">{w.symbol}</span></div>
                    {w.note && <p className="mt-1 text-xs text-muted-foreground">{w.note}</p>}
                    <div className="mt-3 text-xs text-primary flex items-center gap-1">Apri analisi <ArrowRight className="h-3 w-3" /></div>
                  </Link>
                </div>
              ))}
            </div>
          )
        }
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ultime previsioni</h2>
          <Link to="/predictions" className="text-xs text-primary hover:underline">Vedi tutte</Link>
        </div>
        {preds.isLoading ? <div className="text-sm text-muted-foreground">Caricamento…</div> :
          !preds.data || preds.data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Ancora nessuna previsione salvata.</div>
          ) : (
            <div className="grid gap-2">
              {preds.data.slice(0, 5).map((p) => (
                <Link key={p.id} to="/predictions" className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 text-sm hover:bg-accent">
                  <div><span className="font-medium">{p.symbol}</span> <span className="text-muted-foreground text-xs">{p.interval} · {p.horizon_candles} candele</span></div>
                  <span className="text-xs text-muted-foreground">{new Date(p.made_at).toLocaleDateString("it-IT")}</span>
                </Link>
              ))}
            </div>
          )
        }
      </section>
    </div>
  );
}
