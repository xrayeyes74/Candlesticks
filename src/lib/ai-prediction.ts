/**
 * AI Prediction Service
 * Generates price predictions using:
 * - Technical analysis (indicators, patterns)
 * - Volume analysis
 * - Price momentum (short & long-term trends)
 * - Support/Resistance levels
 * - Elliott Wave principles
 * - Fibonacci retracements
 */

import {
  CandleData,
  TechnicalIndicators,
  analyzeTechnicals,
  analyzeCandlePatterns,
  calculateSMA,
  calculateRSI,
  calculateEMA,
} from "./technical-analysis";

export interface PredictionInput {
  candles: CandleData[];
  symbol: string;
  timeframe: "1h" | "4h" | "1d" | "1w"; // timeframe used for analysis
}

export interface PredictionOutput {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number; // 0-100
  timeframe: string;
  priceTargets: {
    optimistic: number; // 75% confidence
    realistic: number; // 50% confidence
    pessimistic: number; // 25% confidence
  };
  supportLevels: number[];
  resistanceLevels: number[];
  factors: PredictionFactor[];
  riskRewardRatio: number;
  generatedAt: Date;
}

export interface PredictionFactor {
  category: "technical" | "volume" | "momentum" | "pattern" | "support_resistance" | "elliott" | "fibonacci";
  name: string;
  signal: "bullish" | "bearish" | "neutral";
  weight: number; // 0-1, importance in final prediction
  confidence: number; // 0-100
}

/**
 * Main prediction engine combining multiple analysis techniques
 */
export function generatePrediction(input: PredictionInput): PredictionOutput {
  const { candles, symbol, timeframe } = input;

  if (candles.length < 50) {
    throw new Error("Insufficient data: need at least 50 candles for reliable prediction");
  }

  const currentPrice = candles[candles.length - 1].close;
  const factors: PredictionFactor[] = [];

  // 1. Technical Indicators Analysis
  const technicalFactors = analyzeTechnicalFactors(candles);
  factors.push(...technicalFactors);

  // 2. Volume Analysis
  const volumeFactors = analyzeVolumeFactors(candles);
  factors.push(...volumeFactors);

  // 3. Momentum Analysis (Short & Long-term)
  const momentumFactors = analyzeMomentumFactors(candles);
  factors.push(...momentumFactors);

  // 4. Support & Resistance
  const srFactors = analyzeSupportResistance(candles);
  factors.push(...srFactors);

  // 5. Candlestick Patterns
  const patternFactors = analyzePatternFactors(candles);
  factors.push(...patternFactors);

  // 6. Elliott Wave Analysis
  const elliottFactors = analyzeElliottWave(candles);
  factors.push(...elliottFactors);

  // 7. Fibonacci Retracement
  const fibonacciFactors = analyzeFibonacci(candles);
  factors.push(...fibonacciFactors);

  // Calculate weighted direction and confidence
  const { direction, confidence } = calculateWeightedSignal(factors);

  // Calculate support and resistance levels
  const { supportLevels, resistanceLevels } = srFactors[0]?.data || {
    supportLevels: [],
    resistanceLevels: [],
  };

  // Calculate price targets based on all factors
  const priceTargets = calculatePriceTargets(currentPrice, factors, candles);

  // Calculate Risk/Reward ratio
  const riskRewardRatio = calculateRiskReward(currentPrice, priceTargets, supportLevels);

  return {
    symbol,
    currentPrice,
    predictedPrice: priceTargets.realistic,
    direction,
    confidence,
    timeframe: `${timeframe} candle`,
    priceTargets,
    supportLevels,
    resistanceLevels,
    factors,
    riskRewardRatio,
    generatedAt: new Date(),
  };
}

/**
 * Analyze technical indicators
 */
function analyzeTechnicalFactors(candles: CandleData[]): PredictionFactor[] {
  const closes = candles.map((c) => c.close);
  const technicals = analyzeTechnicals(candles);
  const factors: PredictionFactor[] = [];

  const currentPrice = closes[closes.length - 1];
  const sma20 = technicals.sma20;
  const sma50 = technicals.sma50;
  const rsi = technicals.rsi;
  const macd = technicals.macd;
  const bollinger = technicals.bollinger;

  // SMA 20/50 crossover analysis
  if (sma20 && sma50) {
    const isAboveSMA20 = currentPrice > sma20;
    const isAboveSMA50 = currentPrice > sma50;
    const sma20AboveSMA50 = sma20 > sma50;

    if (isAboveSMA20 && isAboveSMA50 && sma20AboveSMA50) {
      factors.push({
        category: "technical",
        name: "SMA Alignment (Golden Cross)",
        signal: "bullish",
        weight: 0.8,
        confidence: 85,
      });
    } else if (!isAboveSMA20 && !isAboveSMA50 && !sma20AboveSMA50) {
      factors.push({
        category: "technical",
        name: "SMA Alignment (Death Cross)",
        signal: "bearish",
        weight: 0.8,
        confidence: 85,
      });
    }
  }

  // RSI Analysis
  if (rsi !== null) {
    if (rsi > 70) {
      factors.push({
        category: "technical",
        name: "RSI Overbought",
        signal: "bearish",
        weight: 0.6,
        confidence: Math.min(rsi - 70, 30),
      });
    } else if (rsi < 30) {
      factors.push({
        category: "technical",
        name: "RSI Oversold",
        signal: "bullish",
        weight: 0.6,
        confidence: Math.min(30 - rsi, 30),
      });
    } else if (rsi > 50) {
      factors.push({
        category: "technical",
        name: "RSI Positive Momentum",
        signal: "bullish",
        weight: 0.4,
        confidence: (rsi - 50) * 2,
      });
    }
  }

  // MACD Analysis
  if (macd) {
    if (macd.histogram > 0 && macd.line > macd.signal) {
      factors.push({
        category: "technical",
        name: "MACD Bullish Crossover",
        signal: "bullish",
        weight: 0.7,
        confidence: Math.min(Math.abs(macd.histogram) * 100, 100),
      });
    } else if (macd.histogram < 0 && macd.line < macd.signal) {
      factors.push({
        category: "technical",
        name: "MACD Bearish Crossover",
        signal: "bearish",
        weight: 0.7,
        confidence: Math.min(Math.abs(macd.histogram) * 100, 100),
      });
    }
  }

  // Bollinger Bands Analysis
  if (bollinger) {
    if (currentPrice < bollinger.lower) {
      factors.push({
        category: "technical",
        name: "Price Below Bollinger Lower Band",
        signal: "bullish",
        weight: 0.6,
        confidence: 75,
      });
    } else if (currentPrice > bollinger.upper) {
      factors.push({
        category: "technical",
        name: "Price Above Bollinger Upper Band",
        signal: "bearish",
        weight: 0.6,
        confidence: 75,
      });
    }
  }

  return factors;
}

/**
 * Analyze volume trends
 */
function analyzeVolumeFactors(candles: CandleData[]): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  if (candles.length < 20) return factors;

  const recentVolumes = candles.slice(-5).map((c) => c.volume);
  const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
  const currentVolume = candles[candles.length - 1].volume;
  const currentPrice = candles[candles.length - 1].close;
  const prevPrice = candles[candles.length - 2].close;

  // High volume confirmation
  if (currentVolume > avgVolume * 1.5) {
    const isUpCandle = currentPrice > prevPrice;
    if (isUpCandle) {
      factors.push({
        category: "volume",
        name: "High Volume on Up Move",
        signal: "bullish",
        weight: 0.7,
        confidence: Math.min((currentVolume / avgVolume - 1) * 50, 90),
      });
    } else {
      factors.push({
        category: "volume",
        name: "High Volume on Down Move",
        signal: "bearish",
        weight: 0.7,
        confidence: Math.min((currentVolume / avgVolume - 1) * 50, 90),
      });
    }
  }

  // Volume decreasing (potential reversal)
  if (currentVolume < avgVolume * 0.5) {
    factors.push({
      category: "volume",
      name: "Volume Declining",
      signal: "neutral",
      weight: 0.4,
      confidence: 60,
    });
  }

  return factors;
}

/**
 * Analyze momentum (short-term and long-term)
 */
function analyzeMomentumFactors(candles: CandleData[]): PredictionFactor[] {
  const factors: PredictionFactor[] = [];
  const closes = candles.map((c) => c.close);

  // Short-term momentum (5-10 period)
  const shortTermEMA = calculateEMA(closes, 5);
  const mediumTermEMA = calculateEMA(closes, 13);
  const longTermEMA = calculateEMA(closes, 50);

  const currentPrice = closes[closes.length - 1];

  if (shortTermEMA && mediumTermEMA && longTermEMA) {
    // Uptrend confirmation
    if (shortTermEMA > mediumTermEMA && mediumTermEMA > longTermEMA) {
      factors.push({
        category: "momentum",
        name: "Strong Uptrend (EMA Stack)",
        signal: "bullish",
        weight: 0.85,
        confidence: 80,
      });
    }
    // Downtrend confirmation
    else if (shortTermEMA < mediumTermEMA && mediumTermEMA < longTermEMA) {
      factors.push({
        category: "momentum",
        name: "Strong Downtrend (EMA Stack)",
        signal: "bearish",
        weight: 0.85,
        confidence: 80,
      });
    }
  }

  // Rate of change
  const roc10 = ((closes[closes.length - 1] - closes[Math.max(0, closes.length - 11)]) / closes[Math.max(0, closes.length - 11)]) * 100;
  
  if (roc10 > 5) {
    factors.push({
      category: "momentum",
      name: "Positive Rate of Change",
      signal: "bullish",
      weight: 0.5,
      confidence: Math.min(roc10 * 5, 85),
    });
  } else if (roc10 < -5) {
    factors.push({
      category: "momentum",
      name: "Negative Rate of Change",
      signal: "bearish",
      weight: 0.5,
      confidence: Math.min(Math.abs(roc10) * 5, 85),
    });
  }

  return factors;
}

/**
 * Identify support and resistance levels
 */
function analyzeSupportResistance(candles: CandleData[]): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  if (candles.length < 20) {
    return factors;
  }

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);

  // Find local maxima (resistance)
  const resistanceLevels: number[] = [];
  const supportLevels: number[] = [];

  for (let i = 1; i < candles.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      resistanceLevels.push(highs[i]);
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      supportLevels.push(lows[i]);
    }
  }

  // Get top 3 nearest levels
  const currentPrice = closes[closes.length - 1];
  const nearestResistance = resistanceLevels
    .filter((r) => r > currentPrice)
    .sort((a, b) => a - b)[0];
  const nearestSupport = supportLevels
    .filter((s) => s < currentPrice)
    .sort((a, b) => b - a)[0];

  if (nearestResistance) {
    factors.push({
      category: "support_resistance",
      name: `Resistance at ${nearestResistance.toFixed(2)}`,
      signal: "bearish",
      weight: 0.5,
      confidence: 70,
      data: { supportLevels, resistanceLevels },
    } as any);
  }

  if (nearestSupport) {
    factors.push({
      category: "support_resistance",
      name: `Support at ${nearestSupport.toFixed(2)}`,
      signal: "bullish",
      weight: 0.5,
      confidence: 70,
    });
  }

  return factors;
}

/**
 * Analyze candlestick patterns
 */
function analyzePatternFactors(candles: CandleData[]): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  if (candles.length < 3) return factors;

  const { patterns, strength } = analyzeCandlePatterns(candles);

  for (const pattern of patterns) {
    const isBullish = [
      "Doji",
      "Hammer",
      "Bullish Engulfing",
      "Three White Soldiers",
      "Morning Star",
    ].includes(pattern);

    factors.push({
      category: "pattern",
      name: pattern,
      signal: isBullish ? "bullish" : "bearish",
      weight: 0.6,
      confidence: Math.min(strength, 85),
    });
  }

  return factors;
}

/**
 * Elliott Wave Analysis (simplified)
 */
function analyzeElliottWave(candles: CandleData[]): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  if (candles.length < 50) return factors;

  const closes = candles.map((c) => c.close);
  const recent20 = closes.slice(-20);

  // Identify if we're in an impulsive or corrective wave
  let upCount = 0;
  let downCount = 0;

  for (let i = 1; i < recent20.length; i++) {
    if (recent20[i] > recent20[i - 1]) upCount++;
    else downCount++;
  }

  if (upCount > downCount * 1.5) {
    factors.push({
      category: "elliott",
      name: "Elliott Wave: Impulsive Uptrend",
      signal: "bullish",
      weight: 0.6,
      confidence: Math.min(upCount * 3, 80),
    });
  } else if (downCount > upCount * 1.5) {
    factors.push({
      category: "elliott",
      name: "Elliott Wave: Impulsive Downtrend",
      signal: "bearish",
      weight: 0.6,
      confidence: Math.min(downCount * 3, 80),
    });
  }

  return factors;
}

/**
 * Fibonacci Retracement Analysis
 */
function analyzeFibonacci(candles: CandleData[]): PredictionFactor[] {
  const factors: PredictionFactor[] = [];

  if (candles.length < 30) return factors;

  const closes = candles.map((c) => c.close);
  const recent = closes.slice(-30);

  const high = Math.max(...recent);
  const low = Math.min(...recent);
  const range = high - low;

  // Fibonacci levels
  const fib236 = high - range * 0.236;
  const fib382 = high - range * 0.382;
  const fib50 = high - range * 0.5;
  const fib618 = high - range * 0.618;

  const currentPrice = closes[closes.length - 1];

  // Check if price is near Fibonacci level
  const tolerance = range * 0.02; // 2% tolerance

  if (Math.abs(currentPrice - fib618) < tolerance) {
    factors.push({
      category: "fibonacci",
      name: "Price at 61.8% Fibonacci Retracement",
      signal: "bullish",
      weight: 0.5,
      confidence: 70,
    });
  } else if (Math.abs(currentPrice - fib382) < tolerance) {
    factors.push({
      category: "fibonacci",
      name: "Price at 38.2% Fibonacci Retracement",
      signal: "neutral",
      weight: 0.4,
      confidence: 65,
    });
  }

  return factors;
}

/**
 * Calculate weighted signal based on all factors
 */
function calculateWeightedSignal(factors: PredictionFactor[]): {
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
} {
  if (factors.length === 0) {
    return { direction: "neutral", confidence: 0 };
  }

  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;

  for (const factor of factors) {
    const score = (factor.confidence / 100) * factor.weight;
    totalWeight += factor.weight;

    if (factor.signal === "bullish") {
      bullishScore += score;
    } else if (factor.signal === "bearish") {
      bearishScore += score;
    }
  }

  const bullishRatio = bullishScore / totalWeight;
  const bearishRatio = bearishScore / totalWeight;

  let direction: "bullish" | "bearish" | "neutral" = "neutral";
  let confidence = 0;

  if (bullishRatio > bearishRatio + 0.1) {
    direction = "bullish";
    confidence = Math.min(bullishRatio * 100, 100);
  } else if (bearishRatio > bullishRatio + 0.1) {
    direction = "bearish";
    confidence = Math.min(bearishRatio * 100, 100);
  } else {
    confidence = Math.abs(bullishRatio - bearishRatio) * 50;
  }

  return { direction, confidence };
}

/**
 * Calculate price targets based on multiple techniques
 */
function calculatePriceTargets(
  currentPrice: number,
  factors: PredictionFactor[],
  candles: CandleData[]
): { optimistic: number; realistic: number; pessimistic: number } {
  const closes = candles.map((c) => c.close);
  const atr = calculateATR(candles);
  const direction = factors.filter((f) => f.signal === "bullish").length >
    factors.filter((f) => f.signal === "bearish").length;

  const multiplier = direction ? 1 : -1;

  const optimistic = currentPrice + atr * 3 * multiplier;
  const realistic = currentPrice + atr * 1.5 * multiplier;
  const pessimistic = currentPrice + atr * 0.5 * multiplier;

  return {
    optimistic: Math.max(optimistic, pessimistic),
    realistic,
    pessimistic: Math.min(pessimistic, optimistic),
  };
}

/**
 * Calculate ATR for price targets
 */
function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period) {
    return candles[candles.length - 1].high - candles[candles.length - 1].low;
  }

  let sumTR = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].close;

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    sumTR += tr;
  }

  return sumTR / period;
}

/**
 * Calculate Risk/Reward Ratio
 */
function calculateRiskReward(
  currentPrice: number,
  targets: { optimistic: number; realistic: number; pessimistic: number },
  supportLevels: number[]
): number {
  const nearestSupport = supportLevels.filter((s) => s < currentPrice).sort((a, b) => b - a)[0] || currentPrice * 0.95;

  const risk = currentPrice - nearestSupport;
  const reward = targets.realistic - currentPrice;

  return reward > 0 && risk > 0 ? reward / risk : 1;
}
