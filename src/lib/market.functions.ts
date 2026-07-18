import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Candle, Analysis } from "./ta/types";
import { summarize } from "./ta/indicators";
import { detectPatterns } from "./ta/patterns";

const IntervalSchema = z.enum(["1d", "1h", "1wk"]);
const RangeSchema = z.enum(["5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"]);

const FetchInput = z.object({
  symbol: z.string().min(1).max(20).transform((s) => s.trim().toUpperCase()),
  interval: IntervalSchema.default("1d"),
  range: RangeSchema.default("1y"),
});

async function fetchYahoo(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false&events=div%2Csplit`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      "Accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}: ${res.statusText}`);
  const j = await res.json() as {
    chart: {
      error?: { code: string; description: string } | null;
      result?: Array<{
        timestamp?: number[];
        indicators: { quote: Array<{ open: (number|null)[]; high: (number|null)[]; low: (number|null)[]; close: (number|null)[]; volume: (number|null)[] }> };
      }>;
    };
  };
  if (j.chart.error) throw new Error(j.chart.error.description || "Simbolo non trovato");
  const r = j.chart.result?.[0];
  if (!r || !r.timestamp) throw new Error("Nessun dato disponibile per questo simbolo");
  const q = r.indicators.quote[0];
  const out: Candle[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i], v = q.volume[i];
    if (o == null || h == null || l == null || c == null) continue;
    out.push({ time: r.timestamp[i], open: o, high: h, low: l, close: c, volume: v ?? 0 });
  }
  return out;
}

export const fetchCandles = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => FetchInput.parse(raw))
  .handler(async ({ data }) => {
    const candles = await fetchYahoo(data.symbol, data.interval, data.range);
    return { symbol: data.symbol, interval: data.interval, range: data.range, candles };
  });

export const analyzeSymbol = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => FetchInput.parse(raw))
  .handler(async ({ data }): Promise<{ symbol: string; interval: string; range: string; candles: Candle[]; analysis: Analysis }> => {
    const candles = await fetchYahoo(data.symbol, data.interval, data.range);
    if (candles.length < 30) throw new Error("Storico troppo corto per l'analisi.");
    const indicators = summarize(candles);
    const patternsAll = detectPatterns(candles);
    const cutoff = candles.length - 20;
    const patterns = patternsAll.filter((p) => p.index >= cutoff);
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const changePct = prev ? ((last.close - prev.close) / prev.close) * 100 : 0;
    return {
      symbol: data.symbol,
      interval: data.interval,
      range: data.range,
      candles,
      analysis: { indicators, patterns, lastPrice: last.close, changePct },
    };
  });

// Search symbol via Yahoo autocomplete
const SearchInput = z.object({ q: z.string().min(1).max(60) });
export const searchSymbols = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SearchInput.parse(raw))
  .handler(async ({ data }) => {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(data.q)}&quotesCount=8&newsCount=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    });
    if (!res.ok) return { quotes: [] };
    const j = await res.json() as { quotes?: Array<{ symbol: string; shortname?: string; longname?: string; exchange?: string; quoteType?: string }> };
    return { quotes: (j.quotes ?? []).filter((q) => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "INDEX" || q.quoteType === "CRYPTOCURRENCY")).slice(0, 8) };
  });
