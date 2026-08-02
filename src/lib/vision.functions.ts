/**
 * Image-assisted candle extraction using Gemini (the only free-tier model here with real
 * vision support — Groq's vision models are preview-only and unreliable for this).
 *
 * IMPORTANT: this is a best-effort visual estimate, not exact data. The user provides a
 * few calibration candles with real OHLC values; the model uses them to infer the price
 * scale and estimates the rest. The result is always returned to the client as editable
 * rows — never treated as ground truth.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VISION_MODEL = process.env.VISION_MODEL || "gemini-2.5-flash";
const VISION_BASE_URL = process.env.VISION_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";

const CandleOut = z.object({
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});

const ExtractSchema = z.object({
  candles: z.array(CandleOut),
  notes: z.string().optional(),
});

const CalibrationCandle = z.object({
  position: z.number().int().min(1),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});

const ExtractInput = z.object({
  imageBase64: z.string().min(100), // full data URL, e.g. "data:image/jpeg;base64,...."
  totalCandles: z.number().int().min(2).max(150),
  calibration: z.array(CalibrationCandle).min(1).max(5),
});

export const extractCandlesFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ExtractInput.parse(raw))
  .handler(async ({ data }) => {
    const apiKey = process.env.VISION_API_KEY;
    if (!apiKey) throw new Error("VISION_API_KEY mancante");

    const provider = createOpenAICompatible({
      name: "gemini-vision",
      baseURL: VISION_BASE_URL,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const model = provider(VISION_MODEL);

    const calibrationText = data.calibration
      .map((c) => `Candela #${c.position} (contando da sinistra, la prima è #1): open=${c.open}, high=${c.high}, low=${c.low}, close=${c.close}`)
      .join("\n");

    const prompt = `Guarda questo grafico a candele giapponesi. Contiene ${data.totalCandles} candele visibili, numerate da 1 (più a sinistra) a ${data.totalCandles} (più a destra).

Alcune candele sono già note, usale per calibrare la scala dei prezzi (dedurre quanto vale ogni pixel in termini di prezzo):
${calibrationText}

Stima OPEN, HIGH, LOW, CLOSE per TUTTE le ${data.totalCandles} candele, nello stesso ordine da sinistra a destra. Per le candele di calibrazione elencate sopra, riporta esattamente i valori dati, non stimarli.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo prima o dopo, con questa forma esatta: {"candles": [{"open": number, "high": number, "low": number, "close": number}, ...], "notes": string}. L'array "candles" deve avere ESATTAMENTE ${data.totalCandles} elementi, uno per ciascuna candela visibile. Nel campo "notes" (in italiano), segnala brevemente eventuali candele di cui non sei sicuro o zone del grafico poco leggibili (es. sovrapposizioni, riflessi, bassa risoluzione).`;

    const { output } = await generateText({
      model,
      output: Output.object({ schema: ExtractSchema }),
      maxOutputTokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: data.imageBase64 },
          ],
        },
      ],
    });

    return { candles: output.candles, notes: output.notes ?? "" };
  });
