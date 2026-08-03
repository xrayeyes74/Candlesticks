import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Analysis } from "./ta/types";
import { summarize } from "./ta/indicators";
import { detectPatterns } from "./ta/patterns";
import { fetchHistory, searchSymbols as tdSearch } from "./market-data.server";

const IntervalSchema = z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk", "1mo"]);
const RangeSchema = z.enum(["5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"]);

const FetchInput = z.object({
  symbol: z.string().min(1).max(20).transform((s) => s.trim().toUpperCase()),
  interval: IntervalSchema.default("1d"),
  range: RangeSchema.default("1y"),
});

export const fetchCandles = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => FetchInput.parse(raw))
  .handler(async ({ data }) => {
    const candles = await fetchHistory(data.symbol, data.interval, data.range);
    return { symbol: data.symbol, interval: data.interval, range: data.range, candles };
  });

export const analyzeSymbol = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => FetchInput.parse(raw))
  .handler(async ({ data }): Promise<{ symbol: string; interval: string; range: string; candles: Awaited<ReturnType<typeof fetchHistory>>; analysis: Analysis }> => {
    const candles = await fetchHistory(data.symbol, data.interval, data.range);
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

const SearchInput = z.object({ q: z.string().min(1).max(60) });
export const searchSymbols = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SearchInput.parse(raw))
  .handler(async ({ data }) => {
    const quotes = await tdSearch(data.q).catch(() => []);
    return { quotes };
  });
