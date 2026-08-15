import type { Candle, PatternHit } from "./types";

const body = (c: Candle) => Math.abs(c.close - c.open);
const range = (c: Candle) => c.high - c.low || 1e-9;
const upperShadow = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerShadow = (c: Candle) => Math.min(c.open, c.close) - c.low;
const isBull = (c: Candle) => c.close > c.open;
const isBear = (c: Candle) => c.close < c.open;

// name/description here are the English fallback (used verbatim in AI prompts, and
// as a fallback if a UI somewhere doesn't look up the translated version via `key`).
export function detectPatterns(candles: Candle[]): PatternHit[] {
  const hits: PatternHit[] = [];
  const push = (i: number, key: string, name: string, implication: PatternHit["implication"], description: string) =>
    hits.push({ index: i, time: candles[i].time, key, name, implication, description });

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const b = body(c), r = range(c);
    if (r === 0) continue;

    // Doji
    if (b / r < 0.1) push(i, "doji", "Doji", "neutral", "Indecision: open ≈ close.");

    // Hammer / Hanging Man
    if (b / r < 0.35 && lowerShadow(c) > 2 * b && upperShadow(c) < b) {
      if (i > 0 && candles[i - 1].close < candles[i - 1].open)
        push(i, "hammer", "Hammer", "bullish", "Long lower shadow after a downtrend: possible bullish reversal.");
      else if (i > 0 && candles[i - 1].close > candles[i - 1].open)
        push(i, "hanging_man", "Hanging Man", "bearish", "Small body at the top after an uptrend: possible bearish reversal.");
    }

    // Shooting Star / Inverted Hammer
    if (b / r < 0.35 && upperShadow(c) > 2 * b && lowerShadow(c) < b) {
      if (i > 0 && candles[i - 1].close > candles[i - 1].open)
        push(i, "shooting_star", "Shooting Star", "bearish", "Rejection at the highs after an uptrend: possible bearish reversal.");
      else
        push(i, "inverted_hammer", "Inverted Hammer", "bullish", "Possible bullish reversal, confirm with the next candle.");
    }

    // Marubozu
    if (b / r > 0.9) push(i, isBull(c) ? "marubozu_white" : "marubozu_black", isBull(c) ? "White Marubozu" : "Black Marubozu", isBull(c) ? "bullish" : "bearish",
      "Full body with no shadows: strong directional pressure.");

    if (i >= 1) {
      const p = candles[i - 1];
      // Bullish engulfing
      if (isBear(p) && isBull(c) && c.open < p.close && c.close > p.open)
        push(i, "bullish_engulfing", "Bullish Engulfing", "bullish", "Green candle engulfs the previous red one.");
      // Bearish engulfing
      if (isBull(p) && isBear(c) && c.open > p.close && c.close < p.open)
        push(i, "bearish_engulfing", "Bearish Engulfing", "bearish", "Red candle engulfs the previous green one.");
      // Harami
      if (isBull(p) && isBear(c) && c.open < p.close && c.close > p.open && body(c) < body(p) * 0.7)
        push(i, "bearish_harami", "Bearish Harami", "bearish", "Small bearish body inside the previous bullish body.");
      if (isBear(p) && isBull(c) && c.open > p.close && c.close < p.open && body(c) < body(p) * 0.7)
        push(i, "bullish_harami", "Bullish Harami", "bullish", "Small bullish body inside the previous bearish body.");
    }

    if (i >= 2) {
      const [a, bC, cC] = [candles[i - 2], candles[i - 1], candles[i]];
      // Morning Star
      if (isBear(a) && body(bC) / range(bC) < 0.35 && isBull(cC) && cC.close > (a.open + a.close) / 2)
        push(i, "morning_star", "Morning Star", "bullish", "Three-candle bullish reversal formation.");
      // Evening Star
      if (isBull(a) && body(bC) / range(bC) < 0.35 && isBear(cC) && cC.close < (a.open + a.close) / 2)
        push(i, "evening_star", "Evening Star", "bearish", "Three-candle bearish reversal formation.");
      // Three white soldiers
      if (isBull(a) && isBull(bC) && isBull(cC) && bC.close > a.close && cC.close > bC.close &&
          bC.open > a.open && bC.open < a.close && cC.open > bC.open && cC.open < bC.close)
        push(i, "three_white_soldiers", "Three White Soldiers", "bullish", "Three consecutive green candles with rising closes.");
      // Three black crows
      if (isBear(a) && isBear(bC) && isBear(cC) && bC.close < a.close && cC.close < bC.close &&
          bC.open < a.open && bC.open > a.close && cC.open < bC.open && cC.open > bC.close)
        push(i, "three_black_crows", "Three Black Crows", "bearish", "Three consecutive red candles with falling closes.");
    }
  }
  return hits;
}
