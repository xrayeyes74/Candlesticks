import type { Candle, PatternHit } from "./types";

const body = (c: Candle) => Math.abs(c.close - c.open);
const range = (c: Candle) => c.high - c.low || 1e-9;
const upperShadow = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerShadow = (c: Candle) => Math.min(c.open, c.close) - c.low;
const isBull = (c: Candle) => c.close > c.open;
const isBear = (c: Candle) => c.close < c.open;

export function detectPatterns(candles: Candle[]): PatternHit[] {
  const hits: PatternHit[] = [];
  const push = (i: number, name: string, implication: PatternHit["implication"], description: string) =>
    hits.push({ index: i, time: candles[i].time, name, implication, description });

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const b = body(c), r = range(c);
    if (r === 0) continue;

    // Doji
    if (b / r < 0.1) push(i, "Doji", "neutral", "Indecisione: apertura ≈ chiusura.");

    // Hammer / Hanging Man
    if (b / r < 0.35 && lowerShadow(c) > 2 * b && upperShadow(c) < b) {
      if (i > 0 && candles[i - 1].close < candles[i - 1].open)
        push(i, "Hammer", "bullish", "Ombra inferiore lunga dopo un ribasso: possibile inversione rialzista.");
      else if (i > 0 && candles[i - 1].close > candles[i - 1].open)
        push(i, "Hanging Man", "bearish", "Corpo piccolo in alto dopo un rialzo: possibile inversione ribassista.");
    }

    // Shooting Star / Inverted Hammer
    if (b / r < 0.35 && upperShadow(c) > 2 * b && lowerShadow(c) < b) {
      if (i > 0 && candles[i - 1].close > candles[i - 1].open)
        push(i, "Shooting Star", "bearish", "Rifiuto ai massimi dopo un rialzo: possibile inversione ribassista.");
      else
        push(i, "Inverted Hammer", "bullish", "Possibile inversione rialzista da testare con la candela successiva.");
    }

    // Marubozu
    if (b / r > 0.9) push(i, isBull(c) ? "Marubozu bianco" : "Marubozu nero", isBull(c) ? "bullish" : "bearish",
      "Corpo pieno senza ombre: forte pressione direzionale.");

    if (i >= 1) {
      const p = candles[i - 1];
      // Bullish engulfing
      if (isBear(p) && isBull(c) && c.open < p.close && c.close > p.open)
        push(i, "Bullish Engulfing", "bullish", "Candela verde inghiotte la rossa precedente.");
      // Bearish engulfing
      if (isBull(p) && isBear(c) && c.open > p.close && c.close < p.open)
        push(i, "Bearish Engulfing", "bearish", "Candela rossa inghiotte la verde precedente.");
      // Harami
      if (isBull(p) && isBear(c) && c.open < p.close && c.close > p.open && body(c) < body(p) * 0.7)
        push(i, "Bearish Harami", "bearish", "Piccolo corpo ribassista dentro corpo rialzista.");
      if (isBear(p) && isBull(c) && c.open > p.close && c.close < p.open && body(c) < body(p) * 0.7)
        push(i, "Bullish Harami", "bullish", "Piccolo corpo rialzista dentro corpo ribassista.");
    }

    if (i >= 2) {
      const [a, bC, cC] = [candles[i - 2], candles[i - 1], candles[i]];
      // Morning Star
      if (isBear(a) && body(bC) / range(bC) < 0.35 && isBull(cC) && cC.close > (a.open + a.close) / 2)
        push(i, "Morning Star", "bullish", "Formazione di inversione rialzista a tre candele.");
      // Evening Star
      if (isBull(a) && body(bC) / range(bC) < 0.35 && isBear(cC) && cC.close < (a.open + a.close) / 2)
        push(i, "Evening Star", "bearish", "Formazione di inversione ribassista a tre candele.");
      // Three white soldiers
      if (isBull(a) && isBull(bC) && isBull(cC) && bC.close > a.close && cC.close > bC.close &&
          bC.open > a.open && bC.open < a.close && cC.open > bC.open && cC.open < bC.close)
        push(i, "Three White Soldiers", "bullish", "Tre candele verdi consecutive con chiusure crescenti.");
      // Three black crows
      if (isBear(a) && isBear(bC) && isBear(cC) && bC.close < a.close && cC.close < bC.close &&
          bC.open < a.open && bC.open > a.close && cC.open < bC.open && cC.open > bC.close)
        push(i, "Three Black Crows", "bearish", "Tre candele rosse consecutive con chiusure decrescenti.");
    }
  }
  return hits;
}
