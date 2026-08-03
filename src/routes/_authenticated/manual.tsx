import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Brain, Save, Plus, Trash2, ClipboardPaste, ArrowLeft, ImagePlus, Camera, Wand2, AlertTriangle } from "lucide-react";
import { summarize, sma, ema, bollinger } from "@/lib/ta/indicators";
import { detectPatterns } from "@/lib/ta/patterns";
import type { Candle } from "@/lib/ta/types";
import { generateForecastFromCandles, savePrediction } from "@/lib/forecast.functions";
import { extractCandlesFromImage } from "@/lib/vision.functions";
import { CandlestickChartView } from "@/components/CandlestickChartView";
import { DirectionalProbability } from "@/components/DirectionalProbability";

export const Route = createFileRoute("/_authenticated/manual")({
  component: ManualEntryPage,
  head: () => ({ meta: [{ title: "Inserimento manuale — Candlestick AI" }] }),
});

const INTERVALS = [
  { value: "1m", label: "1 minuto", seconds: 60 },
  { value: "5m", label: "5 minuti", seconds: 5 * 60 },
  { value: "15m", label: "15 minuti", seconds: 15 * 60 },
  { value: "30m", label: "30 minuti", seconds: 30 * 60 },
  { value: "1h", label: "1 ora", seconds: 3600 },
  { value: "4h", label: "4 ore", seconds: 4 * 3600 },
  { value: "1d", label: "1 giorno", seconds: 86400 },
  { value: "1wk", label: "1 settimana", seconds: 7 * 86400 },
  { value: "1mo", label: "1 mese", seconds: 30 * 86400 },
] as const;

interface Row {
  id: string;
  date: string; // datetime-local string
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface CalibRow {
  id: string;
  position: string; // 1-based, counting from the left
  open: string;
  high: string;
  low: string;
  close: string;
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function makeEmptyRow(date: Date): Row {
  return { id: crypto.randomUUID(), date: toDatetimeLocal(date), open: "", high: "", low: "", close: "", volume: "" };
}

function fmt(n: number | null | undefined, d = 2) { return n == null || !isFinite(n) ? "—" : n.toFixed(d); }
function signalColor(s: string) { return s === "buy" ? "text-bull" : s === "sell" ? "text-bear" : "text-neutral"; }
function signalBg(s: string) { return s === "buy" ? "bg-bull/15 text-bull border-bull/30" : s === "sell" ? "bg-bear/15 text-bear border-bear/30" : "bg-muted text-muted-foreground border-border"; }

function ManualEntryPage() {
  const [symbol, setSymbol] = useState("");
  const [interval, setIntervalValue] = useState<(typeof INTERVALS)[number]>(INTERVALS[6]);
  const [rows, setRows] = useState<Row[]>(() => [
    makeEmptyRow(new Date(Date.now() - 86400 * 1000)),
    makeEmptyRow(new Date()),
  ]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [horizon, setHorizon] = useState(10);
  const [showSMA, setShowSMA] = useState(true);
  const [showBB, setShowBB] = useState(false);

  // -- Photo-assisted entry --
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [totalCandlesVisible, setTotalCandlesVisible] = useState("30");
  const [calibRows, setCalibRows] = useState<CalibRow[]>([
    { id: crypto.randomUUID(), position: "1", open: "", high: "", low: "", close: "" },
  ]);
  const [extractNotes, setExtractNotes] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractFn = useServerFn(extractCandlesFromImage);

  function onPhotoSelected(file: File) {
    // Phone photos are often 3-10MB — well over Vercel's ~4.5MB request body
    // limit once base64-encoded. Downscale + recompress client-side first.
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { setPhotoDataUrl(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function addCalibRow() {
    setCalibRows((r) => [...r, { id: crypto.randomUUID(), position: String(r.length + 1), open: "", high: "", low: "", close: "" }]);
  }
  function removeCalibRow(id: string) {
    setCalibRows((r) => r.filter((c) => c.id !== id));
  }
  function updateCalibRow(id: string, field: keyof CalibRow, value: string) {
    setCalibRows((r) => r.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  const extractMut = useMutation({
    mutationFn: () => {
      const total = parseInt(totalCandlesVisible, 10);
      const calibration = calibRows
        .map((c) => ({ position: parseInt(c.position, 10), open: parseFloat(c.open), high: parseFloat(c.high), low: parseFloat(c.low), close: parseFloat(c.close) }))
        .filter((c) => [c.position, c.open, c.high, c.low, c.close].every((n) => !isNaN(n)));
      if (!photoDataUrl) throw new Error("Carica prima una foto del grafico");
      if (!total || total < 2) throw new Error("Indica quante candele sono visibili nel grafico");
      if (calibration.length === 0) throw new Error("Serve almeno una candela di calibrazione compilata");
      return extractFn({ data: { imageBase64: photoDataUrl, totalCandles: total, calibration } });
    },
    onSuccess: (res) => {
      const anchor = new Date();
      const newRows: Row[] = res.candles.map((c, i) => {
        const d = new Date(anchor.getTime() - (res.candles.length - 1 - i) * interval.seconds * 1000);
        return { id: crypto.randomUUID(), date: toDatetimeLocal(d), open: String(c.open), high: String(c.high), low: String(c.low), close: String(c.close), volume: "" };
      });
      setRows(newRows);
      setExtractNotes(res.notes || null);
      setPhotoOpen(false);
      toast.success(`${newRows.length} candele stimate dalla foto — controllale prima di procedere`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Estrazione fallita"),
  });

  const forecastFn = useServerFn(generateForecastFromCandles);
  const saveFn = useServerFn(savePrediction);
  const qc = useQueryClient();

  function addRow() {
    const lastDate = rows.length ? new Date(rows[rows.length - 1].date) : new Date();
    const next = new Date(lastDate.getTime() + interval.seconds * 1000);
    setRows((r) => [...r, makeEmptyRow(next)]);
  }

  function removeRow(id: string) {
    setRows((r) => r.filter((row) => row.id !== id));
  }

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function applyPaste() {
    const lines = pasteText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const startDate = rows.length ? new Date(rows[rows.length - 1].date) : new Date();
    const newRows: Row[] = lines.map((line, i) => {
      const parts = line.split(/[,;\t]+/).map((p) => p.trim());
      const [o, h, l, c, v] = parts;
      const d = new Date(startDate.getTime() + interval.seconds * 1000 * (i + 1));
      return {
        id: crypto.randomUUID(),
        date: toDatetimeLocal(d),
        open: o ?? "",
        high: h ?? "",
        low: l ?? "",
        close: c ?? "",
        volume: v ?? "",
      };
    });
    setRows((r) => [...r, ...newRows]);
    setPasteText("");
    setPasteOpen(false);
    toast.success(`${newRows.length} candele aggiunte`);
  }

  // Parse + validate rows into Candle[]
  const { candles, errors } = useMemo(() => {
    const out: Candle[] = [];
    const errs: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.open && !row.high && !row.low && !row.close) continue; // skip fully empty rows silently
      const o = parseFloat(row.open), h = parseFloat(row.high), l = parseFloat(row.low), c = parseFloat(row.close);
      const v = row.volume ? parseFloat(row.volume) : 0;
      const t = Math.floor(new Date(row.date).getTime() / 1000);
      if ([o, h, l, c].some((n) => isNaN(n)) || isNaN(t)) {
        errs.push(`Riga ${i + 1}: valori mancanti o non numerici`);
        continue;
      }
      if (h < Math.max(o, c) || l > Math.min(o, c) || h < l) {
        errs.push(`Riga ${i + 1}: high/low incoerenti con open/close`);
        continue;
      }
      out.push({ time: t, open: o, high: h, low: l, close: c, volume: isNaN(v) ? 0 : v });
    }
    out.sort((a, b) => a.time - b.time);
    return { candles: out, errors: errs };
  }, [rows]);

  const analysis = useMemo(() => {
    if (candles.length < 2) return null;
    const indicators = summarize(candles);
    const patternsAll = detectPatterns(candles);
    const cutoff = candles.length - 20;
    const patterns = patternsAll.filter((p) => p.index >= cutoff);
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const changePct = prev ? ((last.close - prev.close) / prev.close) * 100 : 0;
    return { indicators, patterns, lastPrice: last.close, changePct };
  }, [candles]);

  const overlays = useMemo(() => {
    if (!candles.length) return [];
    const closes = candles.map((c) => c.close);
    const times = candles.map((c) => c.time);
    const out: { name: string; color: string; data: { time: number; value: number | null }[] }[] = [];
    if (showSMA) {
      const s20 = sma(closes, 20), s50 = sma(closes, 50);
      out.push({ name: "SMA20", color: "#60a5fa", data: times.map((t, i) => ({ time: t, value: s20[i] })) });
      out.push({ name: "SMA50", color: "#f59e0b", data: times.map((t, i) => ({ time: t, value: s50[i] })) });
      const e9 = ema(closes, 9);
      out.push({ name: "EMA9", color: "#a78bfa", data: times.map((t, i) => ({ time: t, value: e9[i] })) });
    }
    if (showBB) {
      const b = bollinger(closes);
      out.push({ name: "BB up", color: "rgba(255,255,255,0.35)", data: times.map((t, i) => ({ time: t, value: b.upper[i] })) });
      out.push({ name: "BB low", color: "rgba(255,255,255,0.35)", data: times.map((t, i) => ({ time: t, value: b.lower[i] })) });
    }
    return out;
  }, [candles, showSMA, showBB]);

  const fcMut = useMutation({
    mutationFn: () =>
      forecastFn({
        data: {
          symbol: symbol.trim() || "MANUALE",
          interval: interval.value,
          candles,
          horizon,
        },
      }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Previsione fallita"),
  });

  const saveMut = useMutation({
    mutationFn: () => {
      if (!fcMut.data) throw new Error("Genera prima una previsione");
      return saveFn({
        data: {
          symbol: symbol.trim() || "MANUALE",
          interval: interval.value,
          anchor_time: fcMut.data.anchor.time,
          horizon_candles: horizon,
          predicted_candles: fcMut.data.candles,
          indicators_snapshot: analysis?.indicators,
          patterns_snapshot: analysis?.patterns,
          rationale: fcMut.data.rationale,
          confidence: fcMut.data.confidence,
          model: fcMut.data.model,
        },
      });
    },
    onSuccess: () => { toast.success("Previsione salvata"); qc.invalidateQueries({ queryKey: ["predictions"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  const canForecast = candles.length >= 15;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <div className="mt-1 flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Inserimento manuale</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Guarda il grafico che ti interessa (screenshot, TradingView, ecc.) e trascrivi qui i valori OHLC delle candele. Nessun dato viene stimato dall'AI: i numeri sono esattamente quelli che inserisci tu.
        </p>
      </div>

      {/* Metadata */}
      <div className="rounded-xl border border-border bg-card p-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground">Simbolo / nome (libero, non deve esistere su Yahoo)</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="es. BTC/USD, il mio titolo, ecc."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Durata di ogni candela</label>
          <select
            value={interval.value}
            onChange={(e) => setIntervalValue(INTERVALS.find((i) => i.value === e.target.value)!)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
      </div>

      {/* Photo-assisted entry */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Estrai da una foto (stima, da correggere)</h3>
          <button onClick={() => setPhotoOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
            <Camera className="h-3.5 w-3.5" /> {photoOpen ? "Chiudi" : "Carica foto"}
          </button>
        </div>

        {photoOpen && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Carica una foto del grafico, indica quante candele sono visibili e inserisci i valori OHLC reali di almeno una candela (meglio due, es. la prima e l'ultima) per calibrare la scala dei prezzi. L'AI stima le altre candele — sono numeri approssimati, da rivedere prima di procedere.
            </p>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onPhotoSelected(e.target.files[0])}
              />
              <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-4 py-3 text-xs hover:bg-accent w-full justify-center">
                <ImagePlus className="h-4 w-4" /> {photoDataUrl ? "Cambia foto" : "Scegli o scatta una foto"}
              </button>
              {photoDataUrl && (
                <img src={photoDataUrl} alt="Grafico caricato" className="mt-3 max-h-64 w-full rounded-md border border-border object-contain bg-black/20" />
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Quante candele sono visibili nel grafico?</label>
              <input type="number" min={2} max={150} value={totalCandlesVisible} onChange={(e) => setTotalCandlesVisible(e.target.value)} className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground">Candele di calibrazione (valori reali noti)</label>
                <button onClick={addCalibRow} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"><Plus className="h-3 w-3" /> Aggiungi</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b border-border/60">
                      <th className="py-1.5 pr-2">Posizione (da sx, 1 = prima)</th>
                      <th className="py-1.5 pr-2">Open</th>
                      <th className="py-1.5 pr-2">High</th>
                      <th className="py-1.5 pr-2">Low</th>
                      <th className="py-1.5 pr-2">Close</th>
                      <th className="py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibRows.map((c) => (
                      <tr key={c.id} className="border-b border-border/30">
                        <td className="py-1 pr-2"><input type="number" min={1} value={c.position} onChange={(e) => updateCalibRow(c.id, "position", e.target.value)} className="w-24 rounded border border-border bg-background px-1.5 py-1" /></td>
                        {(["open", "high", "low", "close"] as const).map((f) => (
                          <td key={f} className="py-1 pr-2"><input type="number" step="any" value={c[f]} onChange={(e) => updateCalibRow(c.id, f, e.target.value)} className="w-20 rounded border border-border bg-background px-1.5 py-1 tabular" /></td>
                        ))}
                        <td className="py-1"><button onClick={() => removeCalibRow(c.id)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={() => extractMut.mutate()}
              disabled={extractMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Wand2 className="h-3.5 w-3.5" /> {extractMut.isPending ? "Analizzo la foto…" : "Stima candele dalla foto"}
            </button>
            <p className="text-[11px] text-muted-foreground">Questo sostituirà le righe attuali nella tabella qui sotto con le candele stimate.</p>
          </div>
        )}

        {extractNotes && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p><strong>Note dell'AI sulla stima:</strong> {extractNotes}</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Candele ({candles.length} valide su {rows.length})</h3>
          <div className="flex gap-2">
            <button onClick={() => setPasteOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
              <ClipboardPaste className="h-3.5 w-3.5" /> Incolla più righe
            </button>
            <button onClick={addRow} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
              <Plus className="h-3.5 w-3.5" /> Aggiungi candela
            </button>
          </div>
        </div>

        {pasteOpen && (
          <div className="mb-4 rounded-md border border-border/60 p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Una candela per riga, valori separati da virgola o tab: <code className="rounded bg-muted px-1">open,high,low,close,volume</code> (volume opzionale). Le date vengono generate automaticamente in sequenza in base alla durata scelta sopra.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={5}
              placeholder={"100.2,101.5,99.8,101.0,15000\n101.0,102.3,100.5,102.1,18000"}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono"
            />
            <button onClick={applyPaste} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              Aggiungi righe
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border/60">
                <th className="py-2 pr-2">Data/ora</th>
                <th className="py-2 pr-2">Open</th>
                <th className="py-2 pr-2">High</th>
                <th className="py-2 pr-2">Low</th>
                <th className="py-2 pr-2">Close</th>
                <th className="py-2 pr-2">Volume</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/30">
                  <td className="py-1 pr-2">
                    <input type="datetime-local" value={row.date} onChange={(e) => updateRow(row.id, "date", e.target.value)} className="w-40 rounded border border-border bg-background px-1.5 py-1" />
                  </td>
                  {(["open", "high", "low", "close"] as const).map((f) => (
                    <td key={f} className="py-1 pr-2">
                      <input type="number" step="any" value={row[f]} onChange={(e) => updateRow(row.id, f, e.target.value)} className="w-20 rounded border border-border bg-background px-1.5 py-1 tabular" />
                    </td>
                  ))}
                  <td className="py-1 pr-2">
                    <input type="number" step="any" value={row.volume} onChange={(e) => updateRow(row.id, "volume", e.target.value)} placeholder="0" className="w-24 rounded border border-border bg-background px-1.5 py-1 tabular" />
                  </td>
                  <td className="py-1">
                    <button onClick={() => removeRow(row.id)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {errors.length > 0 && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground space-y-1">
            {errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}
        {!canForecast && candles.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">Servono almeno 15 candele valide per generare una previsione AI (ne hai {candles.length}). Puoi comunque vedere indicatori e pattern con quelle già inserite.</p>
        )}
      </div>

      {/* Chart + analysis */}
      {candles.length >= 2 && analysis && (
        <>
          <div className="flex items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={showSMA} onChange={(e) => setShowSMA(e.target.checked)} /> SMA/EMA</label>
            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={showBB} onChange={(e) => setShowBB(e.target.checked)} /> Bollinger</label>
          </div>

          <CandlestickChartView candles={candles} predicted={fcMut.data?.candles} optimistic={fcMut.data?.optimistic} pessimistic={fcMut.data?.pessimistic} overlays={overlays} />

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Previsione AI</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label>Orizzonte:</label>
                {[5, 10, 20, 40].map((h) => (
                  <button key={h} onClick={() => setHorizon(h)} className={`rounded px-2 py-1 ${horizon === h ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>{h}</button>
                ))}
                <button onClick={() => fcMut.mutate()} disabled={!canForecast || fcMut.isPending} className="ml-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                  <Brain className="h-3 w-3" />{fcMut.isPending ? "Genero…" : "Genera previsione"}
                </button>
                {fcMut.data && (
                  <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
                    <Save className="h-3 w-3" /> Salva
                  </button>
                )}
              </div>
            </div>
            {fcMut.data ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{fcMut.data.rationale}</p>
                  <p className="text-xs">Confidenza AI: <span className="tabular">{Math.round(fcMut.data.confidence * 100)}%</span></p>
                  <p className="text-[11px] text-muted-foreground">La banda tratteggiata sul grafico mostra un range plausibile (±1 deviazione standard storica), non un altro scenario previsto dall'AI.</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Probabilità direzionale a {horizon} candele</p>
                  <DirectionalProbability probability={fcMut.data.directionalProbability} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Clicca "Genera previsione" per far estendere il grafico con {horizon} candele previste dall'AI, calcolate sui dati che hai inserito.</p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Indicatori</h3>
              <div className="grid grid-cols-2 gap-3 text-sm tabular">
                <IndRow label="Segnale complessivo" value={analysis.indicators.overallSignal.toUpperCase()} valueClass={signalColor(analysis.indicators.overallSignal) + " font-semibold"} />
                <IndRow label="RSI(14)" value={fmt(analysis.indicators.rsi14, 1)} pill={analysis.indicators.rsiSignal} />
                <IndRow label="MACD hist" value={fmt(analysis.indicators.macd.hist, 3)} pill={analysis.indicators.macdSignal} />
                <IndRow label="Trend EMA9/21" value={analysis.indicators.trendSignal.toUpperCase()} pill={analysis.indicators.trendSignal} />
                <IndRow label="Bollinger" value={analysis.indicators.bollingerSignal.toUpperCase()} pill={analysis.indicators.bollingerSignal} />
                <IndRow label="Stocastico %K" value={fmt(analysis.indicators.stochastic.k, 1)} pill={analysis.indicators.stochasticSignal} />
                <IndRow label="SMA20 / SMA50" value={`${fmt(analysis.indicators.sma20)} / ${fmt(analysis.indicators.sma50)}`} />
                <IndRow label="SMA200" value={fmt(analysis.indicators.sma200)} />
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">Gli indicatori che richiedono più storico di quello inserito (es. SMA200 con poche candele) mostrano "—".</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pattern candlestick rilevati</h3>
              {analysis.patterns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun pattern rilevante nelle candele inserite.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {analysis.patterns.slice(-8).reverse().map((p, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 rounded-md border border-border/60 p-2.5">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase ${signalBg(p.implication === "bullish" ? "buy" : p.implication === "bearish" ? "sell" : "hold")}`}>{p.implication}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function IndRow({ label, value, valueClass, pill }: { label: string; value: string; valueClass?: string; pill?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={valueClass}>
        {value}
        {pill && <span className={`ml-2 rounded-full border px-1.5 py-0.5 text-[9px] uppercase ${signalBg(pill)}`}>{pill}</span>}
      </span>
    </div>
  );
}
