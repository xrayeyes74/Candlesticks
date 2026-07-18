
# TA Forecaster — piano di build

App per analizzare titoli di borsa via grafico a candele, generare previsioni con indicatori classici, pattern candlestick e un modello AI che estende visivamente il grafico. Con login, watchlist personale, backtest storico on-demand e tracking delle previsioni salvate.

## Stack

- Frontend: TanStack Start + React + Tailwind + shadcn.
- Grafico: `lightweight-charts` (TradingView) — candlestick + overlay indicatori + serie "previsione".
- Backend: Lovable Cloud (auth email/password + Google, Postgres, server functions).
- Dati di mercato: Yahoo Finance non ufficiale (`query1.finance.yahoo.com/v8/finance/chart`) via server function — nessuna API key. Cache breve (60s intraday, 1h daily).
- AI: Lovable AI Gateway, modello `openai/gpt-5.5`, structured output con schema che restituisce N candele future (OHLC) + rationale testuale.

## Pagine

1. `/` — landing pubblica con CTA login, spiegazione + demo ticker AAPL read-only.
2. `/auth` — login/signup email+password e Google.
3. `/_authenticated/dashboard` — home post-login: watchlist personale, ricerca ticker, ultime previsioni salvate.
4. `/_authenticated/analyze/$symbol` — schermata principale:
   - Selettore timeframe (1D/1W/1M/3M/1Y/5Y) e intervallo candela (1d/1h/1wk).
   - Grafico candlestick con overlay: SMA20/50/200, EMA9/21, Bollinger, volumi.
   - Pannello indicatori: RSI, MACD, Stochastic con segnali buy/sell/hold.
   - Pannello pattern: pattern candlestick rilevati sulle ultime N candele (doji, hammer, engulfing, morning/evening star, harami, shooting star, three white soldiers/black crows) con implicazione.
   - Pulsante "Genera previsione AI" con scelta orizzonte (breve = 10 candele, lungo = 60 candele). Il grafico si estende oltre l'ultima candela reale con candele previste in colore distinto + banda di confidenza. Rationale in linguaggio naturale sotto al grafico.
   - Pulsante "Salva previsione" → snapshot in DB per tracking futuro.
5. `/_authenticated/backtest/$symbol` — backtest storico on-demand: scegli una data passata, il server ricostruisce lo stato al giorno D usando solo dati ≤ D, richiede la previsione all'AI, poi sovrappone previsione vs andamento reale e mostra metriche (direzione corretta sì/no, MAPE sulle chiusure, errore massimo).
6. `/_authenticated/predictions` — cronologia previsioni salvate dell'utente: per ognuna, se sono passate abbastanza candele, confronto ex-post con lo scostamento reale e accuratezza cumulativa (% direzione corretta, MAPE medio).

## Modello dati (Lovable Cloud)

- `profiles(id uuid pk = auth.users.id, display_name, created_at)` con trigger su signup.
- `watchlist(id, user_id, symbol, note, created_at)` — RLS: owner only.
- `predictions(id, user_id, symbol, interval, made_at, anchor_time, horizon_candles, predicted_candles jsonb, indicators_snapshot jsonb, patterns_snapshot jsonb, rationale text, model text)` — RLS: owner only.
- `prediction_evaluations(id, prediction_id, evaluated_at, direction_correct bool, mape numeric, max_error numeric, actual_candles jsonb)` — RLS: via prediction ownership.
- `user_roles` + enum `app_role` + `has_role()` security definer (pattern standard).

## Server functions

- `fetchCandles({symbol, interval, range})` — proxy Yahoo, normalizza in `[{time, open, high, low, close, volume}]`.
- `computeAnalysis({candles})` — indicatori + pattern + segnali (server-side, deterministico).
- `generateForecast({symbol, interval, candles, analysis, horizon})` — chiama AI Gateway con schema `{candles: [{time, open, high, low, close}], rationale, confidence}`. Clamp del numero di candele in codice (non nello schema). Fallback su parsing testuale se lo schema fallisce.
- `savePrediction`, `listPredictions`, `evaluatePrediction` (confronta con candele reali post-anchor).
- `runBacktest({symbol, interval, anchorDate, horizon})` — taglia le candele a `anchorDate`, richiama `computeAnalysis` + `generateForecast`, poi valuta contro le candele reali successive.

## Rendering della "previsione grafica"

Sulla serie candlestick di `lightweight-charts` aggiungiamo:
- una seconda `CandlestickSeries` con `priceScaleId` condiviso, colori più tenui e bordo tratteggiato (via `wickColor` diverso), per le candele previste;
- una `LineSeries` upper/lower per la banda di confidenza (predicted close ± σ suggerito dall'AI, clampato).

## Sicurezza / qualità

- RLS su tutte le tabelle utente, ruoli in tabella separata.
- Disclaimer visibile: "Non è consulenza finanziaria".
- Rate limit soft lato client sulle chiamate AI (debounce + disable pulsante).
- Gestione errori 402/429 dal gateway con messaggio chiaro.

## Dettagli tecnici chiave

- Yahoo endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={i}&range={r}` — chiamato da server function per evitare CORS.
- Indicatori implementati a mano in TS (nessuna dipendenza pesante) in `src/lib/ta/*`.
- Pattern candlestick con regole classiche su ultime 1-3 candele.
- Schema AI: `z.object({ candles: z.array(z.object({ time: z.number(), open: z.number(), high: z.number(), low: z.number(), close: z.number() })), rationale: z.string(), confidence: z.number() })` — nessun `.min/.max` nello schema, i limiti nel prompt + clamp in codice.
- `stopWhen: stepCountIs(50)` non serve (niente tool loop), ma structured output guardato con `NoObjectGeneratedError.isInstance` + fallback su parse di `error.text`.

## Ordine di implementazione

1. Enable Lovable Cloud + auth (email/password + Google).
2. Migrazioni DB + RLS + trigger profilo.
3. Server functions Yahoo + indicatori + pattern.
4. Pagina `/analyze/$symbol` con grafico + indicatori (senza AI).
5. Integrazione AI forecast + rendering candele previste.
6. Watchlist + save prediction + lista predictions con valutazione ex-post.
7. Pagina backtest storico.
8. Landing, /auth, dashboard, disclaimer, SEO head per route.

Vuoi che proceda con questo piano?
