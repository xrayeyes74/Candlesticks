import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAiProvider } from "./ai-gateway.server";
import { fetchHistory } from "./market-data.server";
import { summarize } from "./ta/indicators";
import { detectPatterns } from "./ta/patterns";
import type { Candle } from "./ta/types";

// Defaults target Groq's free OpenAI-compatible tier (no credit card required) so the
// app works out of the box at zero cost. Override via env vars to point at OpenAI,
// Anthropic through a compatible proxy, OpenRouter, Cerebras, etc.
const MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";

const CandleSchema = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});

const ForecastSchema = z.object({
  candles: z.array(CandleSchema),
  rationale: z.string(),
  confidence: z.number(),
  directionalProbability: z.object({
    up: z.number().min(0).max(1),
    down: z.number().min(0).max(1),
    sideways: z.number().min(0).max(1),
  }),
});

function intervalSeconds(interval: string): number {
  switch (interval) {
    case "1m": return 60;
    case "5m": return 5 * 60;
    case "15m": return 15 * 60;
    case "30m": return 30 * 60;
    case "1h": return 3600;
    case "4h": return 4 * 3600;
    case "1wk": return 7 * 86400;
    case "1mo": return 30 * 86400;
    case "1d":
    default: return 86400;
  }
}

// Standard deviation of log returns over the recent window — used to build the
// optimistic/pessimistic band around the AI's central forecast. This is computed
// statistically from real history, not asked of the model, so it stays reliable
// even when the model's own JSON generation has an off day.
function historicalVolatility(candles: Candle[]): number {
  const window = candles.slice(-60);
  const returns: number[] = [];
  for (let i = 1; i < window.length; i++) {
    if (window[i - 1].close > 0 && window[i].close > 0) {
      returns.push(Math.log(window[i].close / window[i - 1].close));
    }
  }
  if (returns.length < 5) return 0.02; // fallback ~2% if too little history
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) || 0.02;
}

interface ForecastResult {
  candles: Candle[];
  rationale: string;
  confidence: number;
  directionalProbability: { up: number; down: number; sideways: number };
  optimistic: { time: number; value: number }[];
  pessimistic: { time: number; value: number }[];
}

async function callForecast(
  symbol: string,
  interval: string,
  candles: Candle[],
  horizon: number,
): Promise<ForecastResult> {
  const attempts = 3;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callForecastOnce(symbol, interval, candles, horizon);
    } catch (error) {
      lastError = error;
      // The model occasionally emits malformed JSON — this is intermittent, not
      // deterministic, so a short retry resolves it most of the time without
      // bothering the user.
    }
  }
  throw new Error(
    `Il modello AI non è riuscito a generare una previsione valida dopo ${attempts} tentativi. Riprova tra poco.` +
      (lastError instanceof Error ? ` (dettaglio: ${lastError.message})` : ""),
  );
}

async function callForecastOnce(
  symbol: string,
  interval: string,
  candles: Candle[],
  horizon: number,
): Promise<ForecastResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error("AI_API_KEY mancante");
  const gateway = createAiProvider(apiKey, { baseURL: AI_BASE_URL, structuredOutputs: false });
  const model = gateway(MODEL);

  const tail = candles.slice(-120);
  const indicators = summarize(candles);
  const patterns = detectPatterns(candles).slice(-8);
  const last = candles[candles.length - 1];
  const stepSec = intervalSeconds(interval);
  const vol = historicalVolatility(candles);

  const prompt = `Sei un analista tecnico. Dato lo storico OHLC del titolo ${symbol} (intervallo ${interval}) e un riassunto degli indicatori, valuta lo scenario più probabile per le prossime ${horizon} candele.

La cosa più importante che devi stimare è la PROBABILITÀ DIREZIONALE (rialzo / ribasso / laterale) — è il segnale principale, più utile di prezzi esatti che nessuno può prevedere con precisione. Genera comunque un percorso di prezzo come illustrazione dello scenario centrale, ma sappi che il valore reale è nella stima delle probabilità e nel ragionamento.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido (nessun testo prima o dopo), con questa forma: {"candles": [{"time": number, "open": number, "high": number, "low": number, "close": number}, ...], "rationale": string, "confidence": number, "directionalProbability": {"up": number, "down": number, "sideways": number}}.

Rispetta queste regole:
- Genera esattamente ${horizon} candele come illustrazione dello scenario centrale.
- Ogni "time" deve essere in secondi Unix, incrementato di ${stepSec} rispetto alla precedente, partendo da ${last.time + stepSec}.
- Ogni candela deve avere low <= min(open, close) e high >= max(open, close).
- Prezzi coerenti con il livello attuale (${last.close.toFixed(2)}); movimenti realistici (volatilità storica recente ~${(vol * 100).toFixed(2)}% per candela).
- "directionalProbability": tre numeri tra 0 e 1 che sommano a 1, la tua stima onesta della probabilità che il prezzo dopo ${horizon} candele sia rispettivamente più alto (up), più basso (down), o sostanzialmente invariato entro ±1 deviazione standard (sideways) rispetto ad oggi. Se l'analisi tecnica è ambigua o debole, NON avere paura di dare probabilità vicine a 1/3 ciascuna — è il risultato onesto, non un fallimento.
- Considera indicatori: RSI ${indicators.rsi14?.toFixed(1)}, MACD hist ${indicators.macd.hist?.toFixed(3)}, trend EMA9/21 ${indicators.trendSignal}, Bollinger ${indicators.bollingerSignal}, segnale complessivo ${indicators.overallSignal}.
- Pattern recenti: ${patterns.map((p) => `${p.name}(${p.implication})`).join(", ") || "nessuno rilevante"}.
- "rationale": 3-5 frasi in italiano che spiegano il ragionamento dietro le probabilità direzionali, basato sull'analisi tecnica.
- "confidence": numero tra 0 e 1, quanto sei sicuro della tua analisi (non della direzione dei prezzi in sé).

Ultime 120 candele (time,open,high,low,close):
${tail.map((c) => `${c.time},${c.open.toFixed(2)},${c.high.toFixed(2)},${c.low.toFixed(2)},${c.close.toFixed(2)}`).join("\n")}`;

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: ForecastSchema }),
      prompt,
      // Larger horizons produce longer JSON; give enough room so the response
      // isn't cut off mid-candle (a frequent cause of "invalid JSON" errors).
      maxOutputTokens: 4096,
    });
    return normalize(output, last, stepSec, horizon, vol);
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const parsed = tryParseJson(error.text ?? "");
      if (parsed) return normalize(parsed, last, stepSec, horizon, vol);
    }
    // Some providers (Groq included) reject malformed JSON server-side before
    // it ever reaches the SDK's own parser, so it doesn't surface as a
    // NoObjectGeneratedError. Try to recover the raw generation from whatever
    // shape the error payload takes before giving up entirely.
    const raw =
      (error as any)?.data?.error?.failed_generation ??
      (error as any)?.responseBody ??
      (error as any)?.cause?.responseBody ??
      (error as any)?.text;
    if (typeof raw === "string") {
      const parsed = tryParseJson(raw);
      if (parsed) return normalize(parsed, last, stepSec, horizon, vol);
    }
    throw error;
  }
}

function tryParseJson(text: string): z.infer<typeof ForecastSchema> | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return ForecastSchema.parse(JSON.parse(m[0]));
  } catch { return null; }
}

function normalize(
  raw: z.infer<typeof ForecastSchema>,
  last: Candle,
  stepSec: number,
  horizon: number,
  vol: number,
): ForecastResult {
  const clipped = raw.candles.slice(0, horizon);
  const priceRef = last.close;
  const outCandles: Candle[] = clipped.map((c, i) => {
    const time = last.time + stepSec * (i + 1);
    const clamp = (v: number) => Math.max(priceRef * 0.5, Math.min(priceRef * 1.8, v));
    const o = clamp(c.open), cl = clamp(c.close);
    let hi = clamp(c.high), lo = clamp(c.low);
    hi = Math.max(hi, o, cl);
    lo = Math.min(lo, o, cl);
    return { time, open: o, high: hi, low: lo, close: cl, volume: 0 };
  });
  const confidence = Math.max(0, Math.min(1, raw.confidence ?? 0.5));

  // Confidence band: ±1 std-dev of historical returns, widening with sqrt(horizon)
  // as in a random-walk model — computed statistically, not by the AI, so it stays
  // reliable regardless of how the model's own JSON generation behaves that day.
  const optimistic = outCandles.map((c, i) => ({
    time: c.time,
    value: c.close * (1 + vol * Math.sqrt(i + 1)),
  }));
  const pessimistic = outCandles.map((c, i) => ({
    time: c.time,
    value: Math.max(0.01, c.close * (1 - vol * Math.sqrt(i + 1))),
  }));

  const dp = raw.directionalProbability ?? { up: 1 / 3, down: 1 / 3, sideways: 1 / 3 };
  const dpSum = dp.up + dp.down + dp.sideways;
  const directionalProbability = dpSum > 0
    ? { up: dp.up / dpSum, down: dp.down / dpSum, sideways: dp.sideways / dpSum }
    : { up: 1 / 3, down: 1 / 3, sideways: 1 / 3 };

  return {
    candles: outCandles,
    rationale: (raw.rationale ?? "").slice(0, 1200),
    confidence,
    directionalProbability,
    optimistic,
    pessimistic,
  };
}

// ---- Server functions ----

const ForecastInput = z.object({
  symbol: z.string().min(1).max(20).transform((s) => s.trim().toUpperCase()),
  interval: z.enum(["1d", "1h", "1wk"]).default("1d"),
  range: z.string().default("1y"),
  horizon: z.number().int().min(3).max(90).default(10),
});

export const generateForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ForecastInput.parse(raw))
  .handler(async ({ data }) => {
    const candles = await fetchHistory(data.symbol, data.interval, data.range);
    if (candles.length < 30) throw new Error("Storico troppo corto");
    const forecast = await callForecast(data.symbol, data.interval, candles, data.horizon);
    return { ...forecast, anchor: candles[candles.length - 1], model: MODEL };
  });

// Same as generateForecast, but for candles the user typed in by hand (e.g. reading
// them off a chart image) instead of fetching from Yahoo. No network call to Yahoo here.
const ManualCandleSchema = CandleSchema.extend({ volume: z.number().min(0).default(0) });
const ForecastFromCandlesInput = z.object({
  symbol: z.string().min(1).max(40).transform((s) => s.trim().toUpperCase()),
  interval: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk", "1mo"]).default("1d"),
  candles: z.array(ManualCandleSchema).min(15, "Servono almeno 15 candele per un'analisi minimamente affidabile"),
  horizon: z.number().int().min(3).max(90).default(10),
});

export const generateForecastFromCandles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ForecastFromCandlesInput.parse(raw))
  .handler(async ({ data }) => {
    const candles = [...data.candles].sort((a, b) => a.time - b.time);
    const forecast = await callForecast(data.symbol, data.interval, candles, data.horizon);
    return { ...forecast, anchor: candles[candles.length - 1], model: MODEL };
  });

// Save prediction
const SavePredictionInput = z.object({
  symbol: z.string(),
  interval: z.string(),
  anchor_time: z.number(),
  horizon_candles: z.number().int(),
  predicted_candles: z.array(CandleSchema.extend({ volume: z.number().default(0) })),
  indicators_snapshot: z.any().optional(),
  patterns_snapshot: z.any().optional(),
  rationale: z.string().optional(),
  confidence: z.number().optional(),
  model: z.string().optional(),
});

export const savePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SavePredictionInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("predictions").insert({
      user_id: context.userId,
      symbol: data.symbol,
      interval: data.interval,
      anchor_time: data.anchor_time,
      horizon_candles: data.horizon_candles,
      predicted_candles: data.predicted_candles,
      indicators_snapshot: data.indicators_snapshot ?? null,
      patterns_snapshot: data.patterns_snapshot ?? null,
      rationale: data.rationale ?? null,
      confidence: data.confidence ?? null,
      model: data.model ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listPredictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("predictions")
      .select("*")
      .order("made_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Historical reliability: aggregates real evaluated outcomes (predictions that have
// already been checked against what actually happened) so the person can see the
// AI's actual track record instead of trusting each new forecast on faith.
export const getPredictionStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: preds, error: e1 } = await context.supabase
      .from("predictions")
      .select("id")
      .limit(2000);
    if (e1) throw new Error(e1.message);
    const ids = (preds ?? []).map((p) => p.id);
    if (ids.length === 0) {
      return { evaluated: 0, directionCorrect: 0, directionAccuracy: null, avgMape: null };
    }
    const { data: evals, error: e2 } = await context.supabase
      .from("prediction_evaluations")
      .select("direction_correct, mape")
      .in("prediction_id", ids);
    if (e2) throw new Error(e2.message);
    const rows = (evals ?? []).filter((e) => e.direction_correct !== null);
    if (rows.length === 0) {
      return { evaluated: 0, directionCorrect: 0, directionAccuracy: null, avgMape: null };
    }
    const correct = rows.filter((r) => r.direction_correct).length;
    const mapeValues = rows.map((r) => r.mape).filter((m): m is number => m != null);
    const avgMape = mapeValues.length > 0 ? mapeValues.reduce((a, b) => a + b, 0) / mapeValues.length : null;
    return {
      evaluated: rows.length,
      directionCorrect: correct,
      directionAccuracy: correct / rows.length,
      avgMape,
    };
  });

const DeletePredictionInput = z.object({ id: z.string().uuid() });
export const deletePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DeletePredictionInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("predictions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Evaluate prediction: fetch real candles after anchor and compare
const EvaluateInput = z.object({ prediction_id: z.string().uuid() });
export const evaluatePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => EvaluateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: pred, error } = await context.supabase.from("predictions").select("*").eq("id", data.prediction_id).single();
    if (error || !pred) throw new Error(error?.message ?? "Not found");
    const predicted = pred.predicted_candles as unknown as Candle[];
    const stepSec = intervalSeconds(pred.interval);
    const range = pred.interval === "1h" ? "3mo" : pred.interval === "1wk" ? "5y" : "2y";
    const all = await fetchHistory(pred.symbol, pred.interval, range);
    const actual = all.filter((c) => c.time > pred.anchor_time && c.time <= pred.anchor_time + stepSec * pred.horizon_candles);
    if (actual.length === 0) {
      return { pending: true, actual_candles: [], mape: null, direction_correct: null, max_error: null };
    }
    const n = Math.min(predicted.length, actual.length);
    let sumPct = 0, maxErr = 0;
    for (let i = 0; i < n; i++) {
      const err = Math.abs(actual[i].close - predicted[i].close) / actual[i].close;
      sumPct += err;
      if (err > maxErr) maxErr = err;
    }
    const mape = (sumPct / n) * 100;
    const anchorClose = pred.anchor_time; // placeholder
    // Direction: sign of (last predicted close - anchor implied close) vs (actual last close - actual first open)
    const predDir = predicted[n - 1].close - predicted[0].open;
    const actDir = actual[n - 1].close - actual[0].open;
    const direction_correct = Math.sign(predDir) === Math.sign(actDir);
    void anchorClose;

    // Upsert evaluation
    await context.supabase.from("prediction_evaluations").delete().eq("prediction_id", pred.id);
    const { data: ev, error: e2 } = await context.supabase.from("prediction_evaluations").insert({
      prediction_id: pred.id,
      direction_correct, mape, max_error: maxErr * 100, actual_candles: actual as unknown as never,
    }).select().single();
    if (e2) throw new Error(e2.message);
    return ev;
  });

// Backtest: pick historical anchor, forecast as-of that date, compare to real
const BacktestInput = z.object({
  symbol: z.string().min(1).max(20).transform((s) => s.trim().toUpperCase()),
  interval: z.enum(["1d", "1h", "1wk"]).default("1d"),
  anchor_time: z.number(), // unix seconds
  horizon: z.number().int().min(3).max(60).default(10),
});
export const runBacktest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => BacktestInput.parse(raw))
  .handler(async ({ data }) => {
    const range = data.interval === "1h" ? "2y" : data.interval === "1wk" ? "max" : "10y";
    const all = await fetchHistory(data.symbol, data.interval, range);
    const before = all.filter((c) => c.time <= data.anchor_time);
    const after = all.filter((c) => c.time > data.anchor_time).slice(0, data.horizon);
    if (before.length < 60) throw new Error("Serve più storico prima della data scelta");
    if (after.length < 3) throw new Error("Storico successivo insufficiente per la valutazione");
    const forecast = await callForecast(data.symbol, data.interval, before, data.horizon);

    const n = Math.min(forecast.candles.length, after.length);
    let sumPct = 0, maxErr = 0;
    for (let i = 0; i < n; i++) {
      const err = Math.abs(after[i].close - forecast.candles[i].close) / after[i].close;
      sumPct += err;
      if (err > maxErr) maxErr = err;
    }
    const mape = (sumPct / n) * 100;
    const predDir = forecast.candles[n - 1].close - forecast.candles[0].open;
    const actDir = after[n - 1].close - after[0].open;
    const direction_correct = Math.sign(predDir) === Math.sign(actDir);

    return {
      symbol: data.symbol,
      interval: data.interval,
      anchor: before[before.length - 1],
      history: before.slice(-200),
      predicted: forecast.candles,
      optimistic: forecast.optimistic,
      pessimistic: forecast.pessimistic,
      directionalProbability: forecast.directionalProbability,
      actual: after,
      rationale: forecast.rationale,
      confidence: forecast.confidence,
      metrics: { mape, max_error: maxErr * 100, direction_correct, evaluated_points: n },
    };
  });

// Watchlist
export const listWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("watchlist").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const AddWatchInput = z.object({ symbol: z.string().min(1).max(20).transform((s) => s.trim().toUpperCase()), note: z.string().max(200).optional() });
export const addWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => AddWatchInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("watchlist").upsert({ user_id: context.userId, symbol: data.symbol, note: data.note ?? null }, { onConflict: "user_id,symbol" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RemoveWatchInput = z.object({ symbol: z.string() });
export const removeWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => RemoveWatchInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("watchlist").delete().eq("symbol", data.symbol);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
