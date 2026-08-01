/**
 * Prediction Results Component
 * Display AI prediction details, trading signal, and analysis
 */

import { MarketReport } from "@/lib/llm-analysis";
import { AlertCircle, TrendingUp, TrendingDown, Target, Shield } from "lucide-react";

export interface PredictionResultsProps {
  report: MarketReport;
  onAddToWatchlist?: () => void;
  onSavePrediction?: () => void;
}

export function PredictionResults({
  report,
  onAddToWatchlist,
  onSavePrediction,
}: PredictionResultsProps) {
  const { prediction, signal, analysis } = report;
  const isBullish = signal.action === "BUY";

  return (
    <div className="space-y-6 p-6 bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{prediction.symbol}</h2>
          <p className="text-muted-foreground mt-1">
            Prezzo attuale: ${prediction.currentPrice.toFixed(2)}
          </p>
        </div>
        <div className={`text-right`}>
          <div className={`text-2xl font-bold ${isBullish ? "text-green-500" : "text-red-500"}`}>
            {signal.action}
          </div>
          <div className="text-sm text-muted-foreground">
            Confidenza: {signal.confidence.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Trading Signal Card */}
      <div className={`p-4 rounded-lg border-2 ${isBullish ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}`}>
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded ${isBullish ? "bg-green-500" : "bg-red-500"}`}>
            {isBullish ? (
              <TrendingUp className="h-6 w-6 text-white" />
            ) : (
              <TrendingDown className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Segnale di Trading</h3>
            <p className="text-sm text-muted-foreground mt-1">{signal.reason}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs text-muted-foreground">Entry</div>
                <div className="font-mono font-bold">${signal.entryPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Take Profit</div>
                <div className="font-mono font-bold text-green-500">${signal.takeProfit.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Stop Loss</div>
                <div className="font-mono font-bold text-red-500">${signal.stopLoss.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Position Size</div>
                <div className="font-mono font-bold">{signal.positionSize.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Targets */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-background border border-border">
          <div className="text-xs text-muted-foreground mb-2">Pessimista (25%)</div>
          <div className="text-xl font-bold text-red-500">
            ${prediction.priceTargets.pessimistic.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {(((prediction.priceTargets.pessimistic - prediction.currentPrice) / prediction.currentPrice) * 100).toFixed(2)}%
          </div>
        </div>
        <div className="p-4 rounded-lg bg-background border border-border">
          <div className="text-xs text-muted-foreground mb-2">Realistico (50%)</div>
          <div className="text-xl font-bold text-primary">
            ${prediction.priceTargets.realistic.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {(((prediction.priceTargets.realistic - prediction.currentPrice) / prediction.currentPrice) * 100).toFixed(2)}%
          </div>
        </div>
        <div className="p-4 rounded-lg bg-background border border-border">
          <div className="text-xs text-muted-foreground mb-2">Ottimista (75%)</div>
          <div className="text-xl font-bold text-green-500">
            ${prediction.priceTargets.optimistic.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {(((prediction.priceTargets.optimistic - prediction.currentPrice) / prediction.currentPrice) * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Risk/Reward Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-background border border-border flex items-center gap-3">
          <Shield className="h-6 w-6 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Risk %</div>
            <div className="font-bold text-red-500">{signal.riskPercentage.toFixed(2)}%</div>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-background border border-border flex items-center gap-3">
          <Target className="h-6 w-6 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Reward %</div>
            <div className="font-bold text-green-500">{signal.rewardPercentage.toFixed(2)}%</div>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-background border border-border">
          <div className="text-xs text-muted-foreground">Risk/Reward</div>
          <div className="font-bold text-primary">1:{prediction.riskRewardRatio.toFixed(2)}</div>
        </div>
      </div>

      {/* Support & Resistance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-background border border-border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Support
          </h4>
          <div className="space-y-2">
            {prediction.supportLevels.slice(0, 3).map((level, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">Level {i + 1}</span>
                <span className="font-mono font-bold">${level.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-background border border-border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Resistance
          </h4>
          <div className="space-y-2">
            {prediction.resistanceLevels.slice(0, 3).map((level, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">Level {i + 1}</span>
                <span className="font-mono font-bold">${level.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LLM Analysis */}
      <div className="p-4 rounded-lg bg-background border border-border">
        <h3 className="font-semibold mb-3">Analisi Dettagliata</h3>
        <p className="text-sm text-muted-foreground mb-4">{analysis.summary}</p>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-2">Fattori Chiave</h4>
            <div className="space-y-2">
              {analysis.keyFactors.slice(0, 5).map((factor, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                      factor.impact === "bullish"
                        ? "bg-green-500"
                        : factor.impact === "bearish"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                    }`}
                  />
                  <div>
                    <div className="font-medium">{factor.factor}</div>
                    <div className="text-xs text-muted-foreground">{factor.analysis}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-semibold mb-2">Rischi Potenziali</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {analysis.riskFactors.slice(0, 3).map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-500" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-semibold mb-2">Strategie Consigliate</h4>
            <p className="text-sm text-muted-foreground">{analysis.tradingStrategy}</p>
          </div>
        </div>
      </div>

      {/* Factors Breakdown */}
      <div className="p-4 rounded-lg bg-background border border-border">
        <h3 className="font-semibold mb-4">Fattori Analizzati</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {prediction.factors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-card/50">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    factor.signal === "bullish"
                      ? "bg-green-500"
                      : factor.signal === "bearish"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                  }`}
                />
                <div>
                  <div className="font-medium">{factor.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {factor.category.replace("_", " ")}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs font-bold">{factor.confidence}%</div>
                <div className="text-xs text-muted-foreground">
                  {(factor.weight * 100).toFixed(0)}% peso
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-border">
        {onSavePrediction && (
          <button
            onClick={onSavePrediction}
            className="flex-1 bg-primary text-primary-foreground rounded-md px-4 py-2 font-medium hover:opacity-90 transition"
          >
            Salva Predizione
          </button>
        )}
        {onAddToWatchlist && (
          <button
            onClick={onAddToWatchlist}
            className="flex-1 border border-border rounded-md px-4 py-2 font-medium hover:bg-accent transition"
          >
            Aggiungi a Watchlist
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-muted-foreground">
        <p className="font-semibold text-yellow-700 mb-1">⚠️ Disclaimer</p>
        <p>{report.disclaimer}</p>
      </div>
    </div>
  );
}
