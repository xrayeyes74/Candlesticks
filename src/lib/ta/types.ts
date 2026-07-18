export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Signal = "buy" | "sell" | "hold";

export interface IndicatorSummary {
  rsi14: number | null;
  rsiSignal: Signal;
  macd: { macd: number | null; signal: number | null; hist: number | null };
  macdSignal: Signal;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema9: number | null;
  ema21: number | null;
  trendSignal: Signal;
  bollinger: { upper: number | null; middle: number | null; lower: number | null };
  bollingerSignal: Signal;
  stochastic: { k: number | null; d: number | null };
  stochasticSignal: Signal;
  overallSignal: Signal;
  overallScore: number; // -1..1
}

export interface PatternHit {
  index: number;
  time: number;
  name: string;
  implication: "bullish" | "bearish" | "neutral";
  description: string;
}

export interface Analysis {
  indicators: IndicatorSummary;
  patterns: PatternHit[];
  lastPrice: number;
  changePct: number; // last vs previous close
}
