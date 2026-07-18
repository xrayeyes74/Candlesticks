import type { Candle, IndicatorSummary, Signal } from "./types";

const last = <T,>(arr: T[]) => (arr.length ? arr[arr.length - 1] : null);

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      sum += values[i];
      if (i === period - 1) {
        prev = sum / period;
        out.push(prev);
      } else out.push(null);
    } else {
      prev = values[i] * k + (prev as number) * (1 - k);
      out.push(prev);
    }
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  out[period] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? (emaFast[i] as number) - (emaSlow[i] as number) : null,
  );
  const cleaned = macdLine.map((v) => (v == null ? 0 : v));
  const firstValid = macdLine.findIndex((v) => v != null);
  const signalSeries: (number | null)[] = new Array(values.length).fill(null);
  if (firstValid >= 0) {
    const sub = cleaned.slice(firstValid);
    const sig = ema(sub, signalPeriod);
    for (let i = 0; i < sig.length; i++) signalSeries[firstValid + i] = sig[i];
  }
  const hist = macdLine.map((v, i) =>
    v != null && signalSeries[i] != null ? v - (signalSeries[i] as number) : null,
  );
  return { macd: macdLine, signal: signalSeries, hist };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  const middle = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue; }
    const slice = values.slice(i - period + 1, i + 1);
    const mean = (middle[i] as number);
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + mult * sd);
    lower.push(mean - mult * sd);
  }
  return { upper, middle, lower };
}

export function stochastic(candles: Candle[], kPeriod = 14, dPeriod = 3) {
  const k: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) { k.push(null); continue; }
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...slice.map((c) => c.high));
    const ll = Math.min(...slice.map((c) => c.low));
    k.push(hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100);
  }
  const kCleaned = k.map((v) => (v == null ? 0 : v));
  const dRaw = sma(kCleaned, dPeriod);
  const d = dRaw.map((v, i) => (k[i] == null ? null : v));
  return { k, d };
}

export function summarize(candles: Candle[]): IndicatorSummary {
  const closes = candles.map((c) => c.close);
  const rsiArr = rsi(closes, 14);
  const rsiVal = last(rsiArr) ?? null;
  const macdRes = macd(closes);
  const macdLast = last(macdRes.macd);
  const sigLast = last(macdRes.signal);
  const histLast = last(macdRes.hist);
  const sma20 = last(sma(closes, 20));
  const sma50 = last(sma(closes, 50));
  const sma200 = last(sma(closes, 200));
  const ema9 = last(ema(closes, 9));
  const ema21 = last(ema(closes, 21));
  const boll = bollinger(closes);
  const upper = last(boll.upper), middle = last(boll.middle), lower = last(boll.lower);
  const stoch = stochastic(candles);
  const kLast = last(stoch.k), dLast = last(stoch.d);
  const price = closes[closes.length - 1];

  const rsiSignal: Signal = rsiVal == null ? "hold" : rsiVal > 70 ? "sell" : rsiVal < 30 ? "buy" : "hold";
  const macdSignal: Signal = histLast == null ? "hold" : histLast > 0 ? "buy" : histLast < 0 ? "sell" : "hold";
  const trendSignal: Signal =
    ema9 != null && ema21 != null
      ? ema9 > ema21 && (sma50 == null || price > sma50) ? "buy"
      : ema9 < ema21 && (sma50 == null || price < sma50) ? "sell" : "hold"
      : "hold";
  const bollingerSignal: Signal =
    upper != null && lower != null
      ? price > upper ? "sell" : price < lower ? "buy" : "hold"
      : "hold";
  const stochasticSignal: Signal =
    kLast != null && dLast != null
      ? kLast > 80 && dLast > 80 ? "sell"
      : kLast < 20 && dLast < 20 ? "buy" : "hold"
      : "hold";

  const scoreOf = (s: Signal) => (s === "buy" ? 1 : s === "sell" ? -1 : 0);
  const parts = [rsiSignal, macdSignal, trendSignal, bollingerSignal, stochasticSignal];
  const overallScore = parts.reduce((a, s) => a + scoreOf(s), 0) / parts.length;
  const overallSignal: Signal = overallScore > 0.2 ? "buy" : overallScore < -0.2 ? "sell" : "hold";

  return {
    rsi14: rsiVal, rsiSignal,
    macd: { macd: macdLast, signal: sigLast, hist: histLast }, macdSignal,
    sma20, sma50, sma200, ema9, ema21, trendSignal,
    bollinger: { upper, middle, lower }, bollingerSignal,
    stochastic: { k: kLast, d: dLast }, stochasticSignal,
    overallSignal, overallScore,
  };
}
