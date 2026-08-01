import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { CandleChart } from "@/components/CandleChart";
import { PredictionResults } from "@/components/PredictionResults";
import { getHistoricalData, searchSymbols, YahooQuote, getQuote } from "@/lib/yahoo-finance";
import { generatePrediction } from "@/lib/ai-prediction";
import { generateMarketReport, MarketReport } from "@/lib/llm-analysis";
import { CandleData, analyzeTechnicals } from "@/lib/technical-analysis";
import { addToWatchlist } from "@/lib/supabase-service";

export const Route = createFileRoute("/chart")({
  component: ChartPage,
  head: () => ({
    meta: [
      {
        title: "Analisi Grafico - Candlestick AI",
      },
      {
        name: "description",
        content: "Analizza grafici candlestick con AI e ottieni previsioni di prezzo in tempo reale",
      },
    ],
  }),
});

interface ChartPageState {
  symbol: string;
  candles: CandleData[];
  currentQuote: YahooQuote | null;
  loading: boolean;
  error: string | null;
  report: MarketReport | null;
  timeframe: "1h" | "4h" | "1d" | "1wk";
  searchResults: Array<{ symbol: string; name: string }>;
  showSearch: boolean;
}

function ChartPage() {
  const [state, setState] = useState<ChartPageState>({
    symbol: "AAPL",
    candles: [],
    currentQuote: null,
    loading: true,
    error: null,
    report: null,
    timeframe: "1d",
    searchResults: [],
    showSearch: false,
  });

  // Load initial data
  useEffect(() => {
    loadChartData("AAPL", "1d");
  }, []);

  const loadChartData = async (symbol: string, timeframe: "1h" | "4h" | "1d" | "1wk") => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch candlestick data
      const range = timeframe === "1h" ? "1mo" : timeframe === "4h" ? "3mo" : timeframe === "1d" ? "1y" : "5y";
      const candles = await getHistoricalData({
        symbol: symbol.toUpperCase(),
        interval: timeframe,
        range: range as any,
      });

      if (candles.length < 50) {
        throw new Error("Dati insufficienti per l'analisi");
      }

      // Fetch current quote
      const quote = await getQuote(symbol.toUpperCase());

      // Generate prediction
      const prediction = generatePrediction({
        candles,
        symbol: symbol.toUpperCase(),
        timeframe,
      });

      // Generate market report
      const report = await generateMarketReport(prediction);

      setState((prev) => ({
        ...prev,
        symbol: symbol.toUpperCase(),
        candles,
        currentQuote: quote,
        report,
        timeframe,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Errore nel caricamento dei dati",
        loading: false,
      }));
    }
  };

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setState((prev) => ({ ...prev, searchResults: [] }));
      return;
    }

    try {
      const results = await searchSymbols(query);
      setState((prev) => ({ ...prev, searchResults: results }));
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const selectSymbol = (symbol: string) => {
    setState((prev) => ({ ...prev, showSearch: false, searchResults: [] }));
    loadChartData(symbol, state.timeframe);
  };

  const handleAddToWatchlist = async () => {
    // TODO: Get user ID from auth context
    try {
      await addToWatchlist("user-id", state.symbol);
      alert("Aggiunto a watchlist!");
    } catch (error) {
      alert("Errore nell'aggiunta a watchlist");
    }
  };

  const handleSavePrediction = async () => {
    // TODO: Implement save prediction to database
    alert("Predizione salvata!");
  };

  const technicals = state.candles.length > 0 ? analyzeTechnicals(state.candles) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{state.symbol}</h1>
            {state.currentQuote && (
              <p className="text-sm text-muted-foreground">
                ${state.currentQuote.regularMarketPrice.toFixed(2)}
                <span className={state.currentQuote.regularMarketChange > 0 ? "text-green-500" : "text-red-500"}>
                  {" "}
                  ({state.currentQuote.regularMarketChangePercent > 0 ? "+" : ""}
                  {state.currentQuote.regularMarketChangePercent.toFixed(2)}%)
                </span>
              </p>
            )}
          </div>

          {/* Symbol Search */}
          <div className="relative w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca simbolo..."
                onChange={(e) => {
                  handleSearch(e.target.value);
                  setState((prev) => ({ ...prev, showSearch: true }));
                }}
                onFocus={() => setState((prev) => ({ ...prev, showSearch: true }))}
                onBlur={() => setTimeout(() => setState((prev) => ({ ...prev, showSearch: false })), 200)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Search Results Dropdown */}
            {state.showSearch && state.searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-md shadow-lg z-20">
                {state.searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => selectSymbol(result.symbol)}
                    className="w-full text-left px-4 py-2 hover:bg-accent border-b border-border last:border-b-0 text-sm transition"
                  >
                    <div className="font-semibold">{result.symbol}</div>
                    <div className="text-xs text-muted-foreground">{result.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2">
            {(["1h", "4h", "1d", "1wk"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => loadChartData(state.symbol, tf)}
                className={`px-4 py-1 rounded text-sm font-medium transition ${
                  state.timeframe === tf
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:bg-accent"
                }`}
              >
                {tf === "1h" ? "1 Ora" : tf === "4h" ? "4 Ore" : tf === "1d" ? "1 Giorno" : "1 Settimana"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {state.error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-700 text-sm">
            {state.error}
          </div>
        )}

        {state.loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Analisi in corso...</p>
            </div>
          </div>
        ) : state.candles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessun dato disponibile</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="lg:col-span-2">
              <CandleChart
                candles={state.candles}
                symbol={state.symbol}
                height={500}
                showVolume={true}
                indicators={{
                  sma20: state.candles.map((_, i) => {
                    const closes = state.candles.slice(0, i + 1).map((c) => c.close);
                    if (closes.length < 20) return null as any;
                    return closes.slice(-20).reduce((a, b) => a + b) / 20;
                  }),
                  sma50: state.candles.map((_, i) => {
                    const closes = state.candles.slice(0, i + 1).map((c) => c.close);
                    if (closes.length < 50) return null as any;
                    return closes.slice(-50).reduce((a, b) => a + b) / 50;
                  }),
                  bollinger: state.candles.map((_, i) => {
                    const closes = state.candles.slice(0, i + 1).map((c) => c.close);
                    if (closes.length < 20) return null as any;
                    const recent = closes.slice(-20);
                    const middle = recent.reduce((a, b) => a + b) / 20;
                    const variance = recent.reduce((sum, c) => sum + Math.pow(c - middle, 2), 0) / 20;
                    const std = Math.sqrt(variance);
                    return {
                      upper: middle + 2 * std,
                      middle,
                      lower: middle - 2 * std,
                    };
                  }),
                }}
              />

              {/* Technical Indicators Summary */}
              {technicals && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <h4 className="text-sm font-semibold mb-3">Indicatori Tecnici</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RSI (14)</span>
                        <span className="font-mono">
                          {technicals.rsi ? technicals.rsi.toFixed(2) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MACD</span>
                        <span className="font-mono">
                          {technicals.macd ? technicals.macd.line.toFixed(4) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SMA 20</span>
                        <span className="font-mono">
                          ${technicals.sma20 ? technicals.sma20.toFixed(2) : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SMA 50</span>
                        <span className="font-mono">
                          ${technicals.sma50 ? technicals.sma50.toFixed(2) : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Prediction Results Sidebar */}
            <div className="lg:col-span-1">
              {state.report ? (
                <PredictionResults
                  report={state.report}
                  onAddToWatchlist={handleAddToWatchlist}
                  onSavePrediction={handleSavePrediction}
                />
              ) : (
                <div className="p-4 bg-card border border-border rounded-lg text-center text-muted-foreground">
                  Caricamento analisi...
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
