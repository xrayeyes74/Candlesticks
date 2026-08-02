import type { Candle } from "./ta/types";

const TD_BASE = "https://api.twelvedata.com";

const INTERVAL_MAP: Record<string, string> = {
  "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min",
  "1h": "1h", "4h": "4h", "1d": "1day", "1wk": "1week", "1mo": "1month",
};

const CANDLES_PER_DAY: Record<string, number> = {
  "1m": 390, "5m": 78, "15m": 26, "30m": 13, "1h": 7, "4h": 2,
  "1d": 1, "1wk": 1 / 5, "1mo": 1 / 21,
};

const TRADING_DAYS_FOR_RANGE: Record<string, number> = {
  "5d": 5, "1mo": 22, "3mo": 65, "6mo": 130, "1y": 260,
  "2y": 520, "5y": 1300, "10y": 2600, "ytd": 200, "max": 4500,
};

function outputSizeFor(interval: string, range: string): number {
  const days = TRADING_DAYS_FOR_RANGE[range] ?? 260;
  const perDay = CANDLES_PER_DAY[interval] ?? 1;
  return Math.min(5000, Math.max(30, Math.ceil(days * perDay)));
}

async function tdFetch(path: string, params: Record<string, string>): Promise<any> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) throw new Error("TWELVE_DATA_API_KEY mancante");
  const qs = new URLSearchParams({ ...params, apikey: apiKey });
  const res = await fetch(`${TD_BASE}${path}?${qs.toString()}`);
  const j: any = await res.json();
  if (j?.status === "error" || (typeof j?.code === "number" && j.code >= 400)) {
    throw new Error(j?.message || `Twelve Data error (HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
  return j;
}

export async function fetchHistory(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const tdInterval = INTERVAL_MAP[interval] || "1day";
  const outputsize = outputSizeFor(interval, range);
  const j = await tdFetch("/time_series", {
    symbol,
    interval: tdInterval,
    outputsize: String(outputsize),
    order: "ASC",
  });
  const values = j.values as Array<{ datetime: string; open: string; high: string; low: string; close: string; volume?: string }> | undefined;
  if (!values || values.length === 0) throw new Error(j?.message || "Nessun dato disponibile per questo simbolo");
  return values.map((v) => {
    const iso = v.datetime.length <= 10 ? `${v.datetime}T00:00:00Z` : `${v.datetime.replace(" ", "T")}Z`;
    return {
      time: Math.floor(new Date(iso).getTime() / 1000),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: v.volume ? parseFloat(v.volume) : 0,
    };
  });
}

export async function fetchQuote(symbol: string) {
  const j = await tdFetch("/quote", { symbol });
  const price = parseFloat(j.close);
  const change = parseFloat(j.change ?? "0");
  const changePercent = parseFloat(j.percent_change ?? "0");
  return {
    symbol: j.symbol as string,
    currency: (j.currency as string) ?? "USD",
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: changePercent,
  };
}

export async function searchSymbols(query: string) {
  const j = await tdFetch("/symbol_search", { symbol: query });
  const data = (j.data ?? []) as Array<{ symbol: string; instrument_name?: string; exchange?: string; instrument_type?: string }>;
  return data
    .filter((d) => ["Common Stock", "ETF", "Index"].includes(d.instrument_type ?? "Common Stock"))
    .slice(0, 8)
    .map((d) => ({
      symbol: d.symbol,
      exchange: d.exchange ?? "",
      longname: d.instrument_name ?? d.symbol,
      shortname: d.instrument_name ?? d.symbol,
    }));
}