/**
 * No account system in this app anymore — everything here lives in the browser's
 * localStorage only. It's per-device (no cross-device sync) and is lost if the
 * user clears their browser/app data. This trade-off was chosen deliberately to
 * avoid running any user accounts or server-side personal data at all.
 */
import type { Candle } from "./ta/types";

const WATCHLIST_KEY = "candlestick-watchlist";
const PREDICTIONS_KEY = "candlestick-predictions";
const MAX_PREDICTIONS = 200;

export interface WatchlistItem {
  id: string;
  symbol: string;
  note?: string;
  created_at: string;
}

export interface SavedPrediction {
  id: string;
  symbol: string;
  interval: string;
  made_at: string;
  anchor_time: number;
  horizon_candles: number;
  predicted_candles: Candle[];
  indicators_snapshot?: unknown;
  patterns_snapshot?: unknown;
  rationale?: string;
  confidence?: number;
  model?: string;
  evaluation?: {
    direction_correct: boolean | null;
    mape: number | null;
    max_error: number | null;
    actual_candles: Candle[];
    evaluated_at: string;
  } | null;
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // storage full or unavailable — fail silently, this is a non-critical feature
  }
}

// -- Watchlist --

export function getWatchlist(): WatchlistItem[] {
  return read<WatchlistItem>(WATCHLIST_KEY).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function addToWatchlist(symbol: string, note?: string) {
  const items = read<WatchlistItem>(WATCHLIST_KEY);
  const upper = symbol.trim().toUpperCase();
  const existingIdx = items.findIndex((i) => i.symbol === upper);
  const entry: WatchlistItem = {
    id: existingIdx >= 0 ? items[existingIdx].id : crypto.randomUUID(),
    symbol: upper,
    note,
    created_at: existingIdx >= 0 ? items[existingIdx].created_at : new Date().toISOString(),
  };
  if (existingIdx >= 0) items[existingIdx] = entry;
  else items.push(entry);
  write(WATCHLIST_KEY, items);
}

export function removeFromWatchlist(symbol: string) {
  write(WATCHLIST_KEY, read<WatchlistItem>(WATCHLIST_KEY).filter((i) => i.symbol !== symbol.toUpperCase()));
}

// -- Predictions --

export function getPredictions(): SavedPrediction[] {
  return read<SavedPrediction>(PREDICTIONS_KEY).sort((a, b) => b.made_at.localeCompare(a.made_at));
}

export function savePredictionLocal(p: Omit<SavedPrediction, "id" | "made_at" | "evaluation">): SavedPrediction {
  const items = read<SavedPrediction>(PREDICTIONS_KEY);
  const entry: SavedPrediction = { ...p, id: crypto.randomUUID(), made_at: new Date().toISOString(), evaluation: null };
  items.push(entry);
  write(PREDICTIONS_KEY, items.slice(-MAX_PREDICTIONS));
  return entry;
}

export function deletePredictionLocal(id: string) {
  write(PREDICTIONS_KEY, read<SavedPrediction>(PREDICTIONS_KEY).filter((p) => p.id !== id));
}

export function saveEvaluation(id: string, evaluation: NonNullable<SavedPrediction["evaluation"]>) {
  const items = read<SavedPrediction>(PREDICTIONS_KEY);
  const idx = items.findIndex((p) => p.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], evaluation };
    write(PREDICTIONS_KEY, items);
  }
}

export function getPredictionStatsLocal() {
  const items = read<SavedPrediction>(PREDICTIONS_KEY).filter((p) => p.evaluation && p.evaluation.direction_correct !== null);
  if (items.length === 0) {
    return { evaluated: 0, directionCorrect: 0, directionAccuracy: null as number | null, avgMape: null as number | null };
  }
  const correct = items.filter((p) => p.evaluation!.direction_correct).length;
  const mapeValues = items.map((p) => p.evaluation!.mape).filter((m): m is number => m != null);
  const avgMape = mapeValues.length > 0 ? mapeValues.reduce((a, b) => a + b, 0) / mapeValues.length : null;
  return { evaluated: items.length, directionCorrect: correct, directionAccuracy: correct / items.length, avgMape };
}
