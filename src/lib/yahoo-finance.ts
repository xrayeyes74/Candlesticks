/**
 * Yahoo Finance Data Service
 * Fetch historical OHLCV data for technical analysis
 */

import { CandleData } from "@/lib/technical-analysis";

const YF_BASE_URL = "https://query1.finance.yahoo.com";

export interface YahooQuote {
  symbol: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
}

export interface HistoryParams {
  symbol: string;
  interval: "1m" | "5m" | "15m" | "30m" | "60m" | "1d" | "1wk" | "1mo";
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "10y" | "ytd" | "max";
}

/**
 * Get current quote for a symbol
 */
export async function getQuote(symbol: string): Promise<YahooQuote> {
  try {
    const url = `${YF_BASE_URL}/v10/finance/quoteSummary/${symbol}?modules=price`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch quote for ${symbol}`);
    }

    const data = await response.json();
    const price = data.quoteSummary.result[0].price;

    return {
      symbol,
      currency: price.currency,
      regularMarketPrice: price.regularMarketPrice.raw,
      regularMarketChange: price.regularMarketChange.raw,
      regularMarketChangePercent: price.regularMarketChangePercent.raw,
    };
  } catch (error) {
    console.error("Error fetching quote:", error);
    throw error;
  }
}

/**
 * Convert range and interval to Unix timestamps
 */
function getTimestamps(
  range: string,
  interval: string
): { period1: number; period2: number } {
  const now = Math.floor(Date.now() / 1000);
  const ranges: Record<string, number> = {
    "1d": 24 * 3600,
    "5d": 5 * 24 * 3600,
    "1mo": 30 * 24 * 3600,
    "3mo": 90 * 24 * 3600,
    "6mo": 180 * 24 * 3600,
    "1y": 365 * 24 * 3600,
    "2y": 730 * 24 * 3600,
    "5y": 1825 * 24 * 3600,
    "10y": 3650 * 24 * 3600,
    ytd: 365 * 24 * 3600, // Simplified
    max: 50 * 365 * 24 * 3600,
  };

  const seconds = ranges[range] || ranges["1y"];
  return {
    period1: now - seconds,
    period2: now,
  };
}

/**
 * Fetch historical candlestick data from Yahoo Finance
 */
export async function getHistoricalData(params: HistoryParams): Promise<CandleData[]> {
  try {
    const { symbol, interval, range } = params;
    const { period1, period2 } = getTimestamps(range, interval);

    const url = `${YF_BASE_URL}/v7/finance/download/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}&events=history&includeAdjustedClose=true`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }

    const csv = await response.text();
    return parseCSV(csv);
  } catch (error) {
    console.error("Error fetching historical data:", error);
    throw error;
  }
}

/**
 * Parse CSV response from Yahoo Finance
 */
function parseCSV(csv: string): CandleData[] {
  const lines = csv.trim().split("\n");
  const candles: CandleData[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const [dateStr, open, high, low, close, adjClose, volume] = lines[i].split(",");

    if (dateStr === "null" || !dateStr) continue;

    const candle: CandleData = {
      date: new Date(dateStr),
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(adjClose || close),
      volume: parseInt(volume),
    };

    // Validate data
    if (
      !isNaN(candle.open) &&
      !isNaN(candle.high) &&
      !isNaN(candle.low) &&
      !isNaN(candle.close) &&
      !isNaN(candle.volume)
    ) {
      candles.push(candle);
    }
  }

  return candles.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Search for stock symbols (autocomplete)
 */
export async function searchSymbols(query: string): Promise<Array<{ symbol: string; name: string }>> {
  try {
    const url = `${YF_BASE_URL}/v1/finance/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to search symbols");
    }

    const data = await response.json();
    return (data.quotes || [])
      .filter((q: any) => q.quoteType === "EQUITY")
      .slice(0, 10)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
      }));
  } catch (error) {
    console.error("Error searching symbols:", error);
    return [];
  }
}

/**
 * Get multiple quotes at once
 */
export async function getMultipleQuotes(symbols: string[]): Promise<YahooQuote[]> {
  const quotes = await Promise.all(
    symbols.map((symbol) =>
      getQuote(symbol).catch(() => ({
        symbol,
        currency: "USD",
        regularMarketPrice: 0,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
      }))
    )
  );

  return quotes;
}

/**
 * Get data for multiple intervals (useful for multi-timeframe analysis)
 */
export async function getMultiTimeframeData(
  symbol: string,
  intervals: Array<"1h" | "4h" | "1d" | "1wk"> = ["1h", "4h", "1d"]
) {
  try {
    const data: Record<string, CandleData[]> = {};

    for (const interval of intervals) {
      data[interval] = await getHistoricalData({
        symbol,
        interval,
        range: interval === "1h" ? "1mo" : interval === "4h" ? "3mo" : "1y",
      });
    }

    return data;
  } catch (error) {
    console.error("Error fetching multi-timeframe data:", error);
    throw error;
  }
}
