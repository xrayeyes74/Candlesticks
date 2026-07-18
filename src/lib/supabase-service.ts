/**
 * Supabase Database Service
 * Manage predictions, watchlist, and user data
 */

import { createClient } from "@supabase/supabase-js";
import { PredictionOutput } from "@/lib/ai-prediction";
import { TradingSignal } from "@/lib/llm-analysis";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Save prediction to database
 */
export async function savePrediction(
  userId: string,
  prediction: PredictionOutput,
  signal: TradingSignal
) {
  try {
    const { data, error } = await supabase.from("predictions").insert({
      user_id: userId,
      symbol: prediction.symbol,
      current_price: prediction.currentPrice,
      predicted_price: prediction.predictedPrice,
      direction: prediction.direction,
      confidence: prediction.confidence,
      timeframe: prediction.timeframe,
      entry_price: signal.entryPrice,
      stop_loss: signal.stopLoss,
      take_profit: signal.takeProfit,
      risk_reward_ratio: prediction.riskRewardRatio,
      factors: prediction.factors,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error saving prediction:", error);
    throw error;
  }
}

/**
 * Get prediction history for user
 */
export async function getPredictionHistory(userId: string, limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching predictions:", error);
    throw error;
  }
}

/**
 * Add symbol to watchlist
 */
export async function addToWatchlist(userId: string, symbol: string) {
  try {
    const { data, error } = await supabase.from("watchlist").insert({
      user_id: userId,
      symbol: symbol.toUpperCase(),
      added_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    throw error;
  }
}

/**
 * Get user's watchlist
 */
export async function getWatchlist(userId: string) {
  try {
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    throw error;
  }
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(userId: string, symbol: string) {
  try {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", userId)
      .eq("symbol", symbol);

    if (error) throw error;
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    throw error;
  }
}

/**
 * Calculate prediction accuracy metrics
 */
export async function calculateAccuracy(userId: string) {
  try {
    const { data: predictions, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .not("actual_price", "is", null);

    if (error) throw error;

    if (!predictions || predictions.length === 0) {
      return null;
    }

    let correctDirection = 0;
    let mapeSum = 0;
    let maxErrorPercent = 0;

    for (const pred of predictions) {
      const predicted = pred.predicted_price;
      const actual = pred.actual_price;
      const direction = pred.direction;

      // Direction accuracy
      const actualDirection = actual > pred.current_price ? "bullish" : "bearish";
      if (direction === actualDirection) {
        correctDirection++;
      }

      // MAPE (Mean Absolute Percentage Error)
      const error = Math.abs((actual - predicted) / predicted) * 100;
      mapeSum += error;
      maxErrorPercent = Math.max(maxErrorPercent, error);
    }

    return {
      totalPredictions: predictions.length,
      correctDirection: correctDirection,
      directionAccuracy: (correctDirection / predictions.length) * 100,
      meanAPE: mapeSum / predictions.length,
      maxError: maxErrorPercent,
    };
  } catch (error) {
    console.error("Error calculating accuracy:", error);
    throw error;
  }
}

/**
 * Update prediction with actual price (for backtest)
 */
export async function updatePredictionWithActual(
  predictionId: string,
  actualPrice: number
) {
  try {
    const { error } = await supabase
      .from("predictions")
      .update({ actual_price: actualPrice, updated_at: new Date().toISOString() })
      .eq("id", predictionId);

    if (error) throw error;
  } catch (error) {
    console.error("Error updating prediction:", error);
    throw error;
  }
}
