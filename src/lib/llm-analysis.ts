/**
 * LLM-powered Analysis Service
 * Uses AI to generate detailed market analysis and trading insights
 * Integrates with @ai-sdk/openai-compatible for flexible LLM support
 */

import { generateObject } from "ai";
import { z } from "zod";
import { PredictionOutput, PredictionFactor } from "./ai-prediction";

// Schema for LLM-generated analysis
const MarketAnalysisSchema = z.object({
  summary: z.string().describe("Concise market analysis summary (100-150 words)"),
  keyFactors: z
    .array(
      z.object({
        factor: z.string(),
        analysis: z.string(),
        impact: z.enum(["bullish", "bearish", "neutral"]),
      })
    )
    .describe("Detailed breakdown of key factors"),
  riskFactors: z.array(z.string()).describe("Key risks to consider"),
  opportunities: z.array(z.string()).describe("Potential opportunities"),
  tradingStrategy: z.string().describe("Recommended trading approach"),
  timeline: z.string().describe("Expected timeframe for target price"),
});

export interface LLMAnalysis {
  summary: string;
  keyFactors: Array<{
    factor: string;
    analysis: string;
    impact: "bullish" | "bearish" | "neutral";
  }>;
  riskFactors: string[];
  opportunities: string[];
  tradingStrategy: string;
  timeline: string;
}

/**
 * Generate detailed LLM analysis for a prediction
 */
export async function generateLLMAnalysis(
  prediction: PredictionOutput,
  modelProvider?: string
): Promise<LLMAnalysis> {
  const baseURL = modelProvider || process.env.VITE_LLM_BASE_URL || "http://localhost:8000/v1";
  const apiKey = process.env.VITE_LLM_API_KEY || "sk-default-key";
  const model = process.env.VITE_LLM_MODEL || "gpt-3.5-turbo";

  const prompt = buildAnalysisPrompt(prediction);

  try {
    const result = await generateObject({
      model: model,
      schema: MarketAnalysisSchema,
      system: `You are an expert financial analyst specializing in technical analysis and trading. 
        Provide detailed, actionable market analysis based on the provided prediction data.
        Consider all technical factors, volume patterns, and momentum indicators.
        Be objective and highlight both bullish and bearish scenarios.
        Use Italian language for analysis.`,
      prompt,
    });

    return result.object as LLMAnalysis;
  } catch (error) {
    console.error("Error generating LLM analysis:", error);
    // Fallback to structured analysis
    return generateFallbackAnalysis(prediction);
  }
}

/**
 * Build detailed prompt for LLM analysis
 */
function buildAnalysisPrompt(prediction: PredictionOutput): string {
  const factorsSummary = prediction.factors
    .map(
      (f) =>
        `- ${f.name} (${f.signal}, confidence: ${f.confidence}%, weight: ${(f.weight * 100).toFixed(0)}%)`
    )
    .join("\n");

  return `
Analizza la seguente predizione di prezzo per ${prediction.symbol}:

**Dati Attuali:**
- Prezzo Attuale: $${prediction.currentPrice.toFixed(2)}
- Direzione Predetta: ${prediction.direction.toUpperCase()}
- Confidenza: ${prediction.confidence.toFixed(1)}%
- Timeframe: ${prediction.timeframe}

**Obiettivi di Prezzo:**
- Ottimista (75% confidenza): $${prediction.priceTargets.optimistic.toFixed(2)}
- Realistico (50% confidenza): $${prediction.priceTargets.realistic.toFixed(2)}
- Pessimista (25% confidenza): $${prediction.priceTargets.pessimistic.toFixed(2)}

**Rapporto Rischio/Reward:** ${prediction.riskRewardRatio.toFixed(2)}

**Fattori Analizzati:**
${factorsSummary}

**Livelli Tecnici:**
- Support: ${prediction.supportLevels.map((s) => `$${s.toFixed(2)}`).join(", ") || "N/A"}
- Resistance: ${prediction.resistanceLevels.map((r) => `$${r.toFixed(2)}`).join(", ") || "N/A"}

Fornisci un'analisi dettagliata includendo:
1. Riepilogo della situazione di mercato
2. Fattori chiave che supportano questa predizione
3. Rischi potenziali
4. Opportunità di trading
5. Strategia di trading consigliata
6. Timeframe atteso per raggiungere il target
`;
}

/**
 * Fallback analysis when LLM is unavailable
 */
function generateFallbackAnalysis(prediction: PredictionOutput): LLMAnalysis {
  const bullishFactors = prediction.factors.filter((f) => f.signal === "bullish");
  const bearishFactors = prediction.factors.filter((f) => f.signal === "bearish");

  const summary = `
${prediction.symbol} mostra una tendenza ${prediction.direction} con ${prediction.confidence.toFixed(0)}% di confidenza.
${bullishFactors.length > 0 ? `${bullishFactors.length} fattori rialzisti` : ""} 
${bearishFactors.length > 0 ? `${bearishFactors.length} fattori ribassisti` : ""}.
Target realistico: $${prediction.priceTargets.realistic.toFixed(2)}, 
Rapporto rischio/reward: ${prediction.riskRewardRatio.toFixed(2)}.
  `.trim();

  return {
    summary,
    keyFactors: prediction.factors.slice(0, 5).map((f) => ({
      factor: f.name,
      analysis: `${f.category.replace("_", " ")}: ${f.name} con ${f.confidence}% di confidenza`,
      impact: f.signal,
    })),
    riskFactors: [
      `Resistenza a $${prediction.resistanceLevels[0]?.toFixed(2) || "N/A"}`,
      "Volatilità di mercato inaspettata",
      "Notizie economiche non previste",
    ],
    opportunities: [
      `Entry point lungo $${prediction.currentPrice.toFixed(2)}`,
      `Target first: $${prediction.priceTargets.realistic.toFixed(2)}`,
      `Target esteso: $${prediction.priceTargets.optimistic.toFixed(2)}`,
    ],
    tradingStrategy: `${
      prediction.direction === "bullish"
        ? "Strategia di acquisto con stop loss sotto il support principale"
        : "Strategia di vendita con stop loss sopra la resistance principale"
    }. Gestire il rischio con position sizing conservativo data la volatilità.`,
    timeline: `${prediction.timeframe} - Monitorare i livelli tecnici chiave`,
  };
}

/**
 * Generate trading signal with confidence intervals
 */
export interface TradingSignal {
  action: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskPercentage: number;
  rewardPercentage: number;
  positionSize: number; // in percentage of account
  confidence: number;
  reason: string;
}

export function generateTradingSignal(prediction: PredictionOutput): TradingSignal {
  const action =
    prediction.confidence > 70
      ? prediction.direction === "bullish"
        ? "BUY"
        : "SELL"
      : "HOLD";

  const stopLoss =
    prediction.direction === "bullish"
      ? prediction.supportLevels[0] || prediction.currentPrice * 0.97
      : prediction.resistanceLevels[0] || prediction.currentPrice * 1.03;

  const takeProfit = prediction.priceTargets.realistic;

  const riskPoints = Math.abs(prediction.currentPrice - stopLoss);
  const rewardPoints = Math.abs(takeProfit - prediction.currentPrice);

  const riskPercentage = (riskPoints / prediction.currentPrice) * 100;
  const rewardPercentage = (rewardPoints / prediction.currentPrice) * 100;

  // Position sizing based on confidence
  const positionSize = Math.min(prediction.confidence / 100, 1) * 5; // Max 5% per trade

  const reason = `
${action === "BUY" ? "Segnale di acquisto:" : "Segnale di vendita:"} 
${prediction.direction} con ${prediction.confidence.toFixed(0)}% di confidenza.
${prediction.factors
  .filter((f) => f.weight > 0.7)
  .slice(0, 2)
  .map((f) => f.name)
  .join(", ")} confermano la tendenza.
Risk/Reward: 1:${(rewardPercentage / riskPercentage).toFixed(2)}
  `.trim();

  return {
    action,
    entryPrice: prediction.currentPrice,
    stopLoss,
    takeProfit,
    riskPercentage,
    rewardPercentage,
    positionSize,
    confidence: prediction.confidence,
    reason,
  };
}

/**
 * Generate market report combining prediction and analysis
 */
export interface MarketReport {
  symbol: string;
  timestamp: Date;
  prediction: PredictionOutput;
  analysis: LLMAnalysis;
  signal: TradingSignal;
  disclaimer: string;
}

export async function generateMarketReport(
  prediction: PredictionOutput
): Promise<MarketReport> {
  const analysis = await generateLLMAnalysis(prediction);
  const signal = generateTradingSignal(prediction);

  return {
    symbol: prediction.symbol,
    timestamp: new Date(),
    prediction,
    analysis,
    signal,
    disclaimer: `
DISCLAIMER: Questo report è generato a scopo educativo solamente.
Non costituisce consulenza finanziaria. Il trading comporta rischi significativi.
Non investire denaro che non puoi permetterti di perdere.
Consultare sempre un consulente finanziario qualificato prima di prendere decisioni di investimento.
Le previsioni storiche non garantiscono risultati futuri.
    `.trim(),
  };
}
