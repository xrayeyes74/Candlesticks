/**
 * Technical indicators calculation
 * RSI, MACD, Bollinger Bands, SMA, etc.
 */

export interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  rsi: number | null;
  macd: { line: number; signal: number; histogram: number } | null;
  bollinger: { upper: number; middle: number; lower: number } | null;
  atr: number | null;
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Calculate Relative Strength Index
 */
export function calculateRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { line: number; signal: number; histogram: number } | null {
  if (closes.length < slowPeriod) return null;

  const ema12 = calculateEMA(closes, fastPeriod);
  const ema26 = calculateEMA(closes, slowPeriod);

  if (!ema12 || !ema26) return null;

  const macdLine = ema12 - ema26;
  
  // Calculate signal line (9-period EMA of MACD)
  // Simplified: using last 9 MACD values
  const macdHistories = [];
  for (let i = Math.max(0, closes.length - 20); i < closes.length; i++) {
    const e12 = calculateEMA(closes.slice(0, i + 1), fastPeriod);
    const e26 = calculateEMA(closes.slice(0, i + 1), slowPeriod);
    if (e12 && e26) {
      macdHistories.push(e12 - e26);
    }
  }

  const signalLine = calculateEMA(macdHistories, signalPeriod) || macdLine;
  const histogram = macdLine - signalLine;

  return { line: macdLine, signal: signalLine, histogram };
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;

  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number; middle: number; lower: number } | null {
  if (closes.length < period) return null;

  const recentCloses = closes.slice(-period);
  const middle = recentCloses.reduce((a, b) => a + b, 0) / period;

  const variance =
    recentCloses.reduce((sum, close) => sum + Math.pow(close - middle, 2), 0) /
    period;
  const std = Math.sqrt(variance);

  return {
    upper: middle + stdDev * std,
    middle,
    lower: middle - stdDev * std,
  };
}

/**
 * Calculate Average True Range
 */
export function calculateATR(candles: CandleData[], period: number = 14): number | null {
  if (candles.length < period) return null;

  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  return atr;
}

/**
 * Get all technical indicators for a given candle data
 */
export function analyzeTechnicals(candles: CandleData[]): TechnicalIndicators {
  if (candles.length === 0) {
    return {
      sma20: null,
      sma50: null,
      rsi: null,
      macd: null,
      bollinger: null,
      atr: null,
    };
  }

  const closes = candles.map((c) => c.close);

  return {
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    bollinger: calculateBollingerBands(closes),
    atr: calculateATR(candles),
  };
}

/**
 * Analyze candlestick patterns
 */
export interface PatternAnalysis {
  patterns: string[];
  strength: number; // 0-100
}

export function analyzeCandlePatterns(candles: CandleData[]): PatternAnalysis {
  if (candles.length < 3) return { patterns: [], strength: 0 };

  const patterns: string[] = [];
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const prevPrevCandle = candles[candles.length - 3];

  // Doji pattern
  if (Math.abs(lastCandle.open - lastCandle.close) < (lastCandle.high - lastCandle.low) * 0.1) {
    patterns.push("Doji");
  }

  // Hammer pattern
  if (
    lastCandle.close > lastCandle.open &&
    lastCandle.open - lastCandle.low > (lastCandle.high - lastCandle.low) * 0.6
  ) {
    patterns.push("Hammer");
  }

  // Engulfing pattern (bullish)
  if (
    lastCandle.close > prevCandle.open &&
    lastCandle.open < prevCandle.close &&
    lastCandle.close > lastCandle.open
  ) {
    patterns.push("Bullish Engulfing");
  }

  // Engulfing pattern (bearish)
  if (
    lastCandle.close < prevCandle.open &&
    lastCandle.open > prevCandle.close &&
    lastCandle.close < lastCandle.open
  ) {
    patterns.push("Bearish Engulfing");
  }

  // Three White Soldiers
  if (
    lastCandle.close > lastCandle.open &&
    prevCandle.close > prevCandle.open &&
    prevPrevCandle.close > prevPrevCandle.open &&
    lastCandle.close > prevCandle.close &&
    prevCandle.close > prevPrevCandle.close
  ) {
    patterns.push("Three White Soldiers");
  }

  const strength = patterns.length > 0 ? Math.min(100, patterns.length * 30) : 0;

  return { patterns, strength };
}
