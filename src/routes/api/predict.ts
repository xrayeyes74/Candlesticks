/**
 * API Route: Generate Price Prediction
 * POST /api/predict
 * 
 * Accepts candlestick data and generates AI-powered prediction
 */

import { generatePrediction, PredictionInput } from "@/lib/ai-prediction";
import { generateMarketReport } from "@/lib/llm-analysis";
import { CandleData } from "@/lib/technical-analysis";

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const { candles, symbol, timeframe } = body as {
      candles: CandleData[];
      symbol: string;
      timeframe: "1h" | "4h" | "1d" | "1w";
    };

    if (!candles || candles.length < 50) {
      return new Response(
        JSON.stringify({
          error: "At least 50 candles required for analysis",
        }),
        { status: 400 }
      );
    }

    // Generate prediction
    const prediction = generatePrediction({
      candles,
      symbol,
      timeframe,
    } as PredictionInput);

    // Generate market report with LLM analysis
    const report = await generateMarketReport(prediction);

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Prediction failed",
      }),
      { status: 500 }
    );
  }
};
