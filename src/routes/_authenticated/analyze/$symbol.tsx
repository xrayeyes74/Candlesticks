import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSymbol } from "@/lib/market.functions";
import { generateForecast, savePrediction, addWatchlist } from "@/lib/forecast.functions";
import { CandlestickChartView } from "@/components/CandlestickChartView";
import { DirectionalProbability } from "@/components/DirectionalProbability";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { sma, ema, bollinger } from "@/lib/ta/indicators";
import { Brain, Save, Star, ArrowLeft, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analyze/$symbol")({
  component: AnalyzePage,
  head: ({ params }) => ({ meta: [{ title: `${params.symbol} — Candlestick AI` }] }),
});

const INTERVAL_OPTIONS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk", "1mo"] as const;
const RANGE_OPTIONS = ["5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"] as const;

function fmt(n: number | null | undefined, d = 2) { return n == null || !isFinite(n) ? "—" : n.toFixed(d); }
function pct(n: number | null | undefined) { return n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`; }
function signalColor(s: string) { return s === "buy" ? "text-bull" : s === "sell" ? "text-bear" : "text-neutral"; }
function signalBg(s: string) { return s === "buy" ? "bg-bull/15 text-bull border-bull/30" : s === "sell" ? "bg-bear/15 text-bear border-bear/30" : "bg-muted text-muted-foreground border-border"; }

function AnalyzePage() {
  const { t, i18n } = useTranslation();
  const { symbol } = Route.useParams();
  const [interval, setInterval] = useState<(typeof INTERVAL_OPTIONS)[number]>("1d");
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>("1y");
  const [horizon, setHorizon] = useState(10);
  const [showSMA, setShowSMA] = useState(true);
  const [showBB, setShowBB] = useState(false);

  const analyze = useServerFn(analyzeSymbol);
  const forecast = useServerFn(generateForecast);
  const save = useServerFn(savePrediction);
  const addWl = useServerFn(addWatchlist);
  const qc = useQueryClient();

  const data = useQuery({
    queryKey: ["analysis", symbol, interval, range],
    queryFn: () => analyze({ data: { symbol, interval: interval as any, range: range as any } }),
  });

  const fcMut = useMutation({
    mutationFn: () => forecast({ data: { symbol, interval: interval as any, range: range as any, horizon, language: i18n.language } }),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("analyze.forecastFailed")),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      if (!fcMut.data || !data.data) throw new Error(t("manual.genPredictionFirst"));
      return save({
        data: {
          symbol, interval,
          anchor_time: fcMut.data.anchor.time,
          horizon_candles: horizon,
          predicted_candles: fcMut.data.candles,
          indicators_snapshot: data.data.analysis.indicators,
          patterns_snapshot: data.data.analysis.patterns,
          rationale: fcMut.data.rationale,
          confidence: fcMut.data.confidence,
          model: fcMut.data.model,
        },
      });
    },
    onSuccess: () => { toast.success(t("analyze.predictionSaved")); qc.invalidateQueries({ queryKey: ["predictions"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.error")),
  });

  const overlays = useMemo(() => {
    if (!data.data) return [];
    const closes = data.data.candles.map((c) => c.close);
    const times = data.data.candles.map((c) => c.time);
    const out: { name: string; color: string; data: { time: number; value: number | null }[] }[] = [];
    if (showSMA) {
      const s20 = sma(closes, 20), s50 = sma(closes, 50);
      out.push({ name: "SMA20", color: "#60a5fa", data: times.map((t, i) => ({ time: t, value: s20[i] })) });
      out.push({ name: "SMA50", color: "#f59e0b", data: times.map((t, i) => ({ time: t, value: s50[i] })) });
      const e9 = ema(closes, 9);
      out.push({ name: "EMA9", color: "#a78bfa", data: times.map((t, i) => ({ time: t, value: e9[i] })) });
    }
    if (showBB) {
      const b = bollinger(closes);
      out.push({ name: "BB up", color: "rgba(255,255,255,0.35)", data: times.map((t, i) => ({ time: t, value: b.upper[i] })) });
      out.push({ name: "BB low", color: "rgba(255,255,255,0.35)", data: times.map((t, i) => ({ time: t, value: b.lower[i] })) });
    }
    return out;
  }, [data.data, showSMA, showBB]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> {t("nav.dashboard")}</Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tabular">{symbol}</h1>
            {data.data && (
              <>
                <span className="text-xl tabular">{fmt(data.data.analysis.lastPrice)}</span>
                <span className={`text-sm tabular ${data.data.analysis.changePct >= 0 ? "text-bull" : "text-bear"}`}>{pct(data.data.analysis.changePct)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => addWl({ data: { symbol } }).then(() => toast.success(t("dashboard.addedToWatchlist"))).catch((e) => toast.error(e.message))} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"><Star className="h-3.5 w-3.5" /> Watchlist</button>
          <Link to="/backtest/$symbol" params={{ symbol }} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"><History className="h-3.5 w-3.5" /> {t("analyze.backtest")}</Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">{t("analyze.candleDuration")}</label>
          <select value={interval} onChange={(e) => setInterval(e.target.value as any)} className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm">
            {INTERVAL_OPTIONS.map((o) => <option key={o} value={o}>{t(`units.${o}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t("analyze.historicalPeriod")}</label>
          <select value={range} onChange={(e) => setRange(e.target.value as any)} className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm">
            {RANGE_OPTIONS.map((o) => <option key={o} value={o}>{t(`units.${o}`)}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2 items-center text-xs pb-2">
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={showSMA} onChange={(e) => setShowSMA(e.target.checked)} /> {t("manual.smaEma")}</label>
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={showBB} onChange={(e) => setShowBB(e.target.checked)} /> {t("analyze.bollinger")}</label>
        </div>
      </div>

      {data.isLoading && <div className="h-[460px] flex items-center justify-center text-muted-foreground">{t("common.loading")}</div>}
      {data.error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">{(data.error as Error).message}</div>}
      {data.data && (
        <>
          <CandlestickChartView
            candles={data.data.candles}
            predicted={fcMut.data?.candles}
            optimistic={fcMut.data?.optimistic}
            pessimistic={fcMut.data?.pessimistic}
            overlays={overlays}
          />

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{t("analyze.aiForecast")}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label>{t("analyze.horizon")}</label>
                {[5, 10, 20, 40, 60].map((h) => (
                  <button key={h} onClick={() => setHorizon(h)} className={`rounded px-2 py-1 ${horizon === h ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>{h}</button>
                ))}
                <button onClick={() => fcMut.mutate()} disabled={fcMut.isPending} className="ml-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                  <Brain className="h-3 w-3" />{fcMut.isPending ? t("analyze.generating") : t("analyze.generateForecast")}
                </button>
                {fcMut.data && (
                  <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                    <Save className="h-3 w-3" /> {t("common.save")}
                  </button>
                )}
              </div>
            </div>
            {fcMut.data ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{fcMut.data.rationale}</p>
                  <p className="text-xs">{t("analyze.confidence")} <span className="tabular">{Math.round(fcMut.data.confidence * 100)}%</span></p>
                  <p className="text-[11px] text-muted-foreground">{t("analyze.bandHint")}</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t("analyze.directionalProbability", { horizon })}</p>
                  <DirectionalProbability probability={fcMut.data.directionalProbability} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("analyze.forecastHint", { horizon })}</p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("analyze.indicators")}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm tabular">
                <IndRow label={t("analyze.overallSignal")} value={data.data.analysis.indicators.overallSignal.toUpperCase()} valueClass={signalColor(data.data.analysis.indicators.overallSignal) + " font-semibold"} />
                <IndRow label="RSI(14)" value={fmt(data.data.analysis.indicators.rsi14, 1)} pill={data.data.analysis.indicators.rsiSignal} />
                <IndRow label="MACD hist" value={fmt(data.data.analysis.indicators.macd.hist, 3)} pill={data.data.analysis.indicators.macdSignal} />
                <IndRow label={t("analyze.trend")} value={data.data.analysis.indicators.trendSignal.toUpperCase()} pill={data.data.analysis.indicators.trendSignal} />
                <IndRow label={t("analyze.bollinger")} value={data.data.analysis.indicators.bollingerSignal.toUpperCase()} pill={data.data.analysis.indicators.bollingerSignal} />
                <IndRow label={t("analyze.stochastic")} value={fmt(data.data.analysis.indicators.stochastic.k, 1)} pill={data.data.analysis.indicators.stochasticSignal} />
                <IndRow label="SMA20 / SMA50" value={`${fmt(data.data.analysis.indicators.sma20)} / ${fmt(data.data.analysis.indicators.sma50)}`} />
                <IndRow label="SMA200" value={fmt(data.data.analysis.indicators.sma200)} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("analyze.patternsDetected")}</h3>
              {data.data.analysis.patterns.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("analyze.noPatterns")}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.data.analysis.patterns.slice(-8).reverse().map((p, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 rounded-md border border-border/60 p-2.5">
                      <div>
                        <div className="font-medium">{t(`patterns.${p.key}.name`, p.name)}</div>
                        <div className="text-xs text-muted-foreground">{t(`patterns.${p.key}.description`, p.description)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(p.time * 1000).toLocaleDateString(i18n.language)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase ${signalBg(p.implication === "bullish" ? "buy" : p.implication === "bearish" ? "sell" : "hold")}`}>{p.implication}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function IndRow({ label, value, valueClass, pill }: { label: string; value: string; valueClass?: string; pill?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={valueClass}>
        {value}
        {pill && <span className={`ml-2 rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${signalBg(pill)}`}>{pill}</span>}
      </span>
    </div>
  );
}
