># 🕯️ Candlestick AI - Analisi Tecnica e Previsioni AI

Applicazione full-stack per l'analisi di grafici candlestick con previsioni di prezzo basate su AI, indicatori tecnici avanzati e riconoscimento di pattern.

## ✨ Features

### 📊 Analisi Tecnica Multi-Fattore
- **Indicatori Tecnici**: RSI, MACD, Bollinger Bands, SMA, EMA, ATR
- **Pattern Candlestick**: Doji, Hammer, Engulfing, Three White Soldiers, Morning Star
- **Analisi dei Volumi**: High volume confirmation, Volume trend reversal
- **Momentum (Short & Long-term)**: EMA stack alignment, Rate of Change
- **Support & Resistance**: Identificazione automatica livelli
- **Elliott Wave**: Analisi delle onde impulsive vs correttive (semplificata)
- **Fibonacci Retracement**: Livelli 23.6%, 38.2%, 50%, 61.8%

### 🤖 Previsioni AI
- Motore di predizione che integra **7 categorie di analisi**
- Analisi LLM per interpretazione contesto di mercato
- Segnali di trading automatici con position sizing
- Target price multipli (ottimista, realistico, pessimista)
- Risk/Reward ratio calcolato automaticamente

### 📈 Interfaccia Utente
- Grafici candlestick interattivi (lightweight-charts)
- Visualizzazione indicatori tecnici sovrapposti
- Ricerca simboli con autocomplete (Yahoo Finance)
- Dati storici e quotazioni **ritardati di ~15-20 minuti** (Yahoo Finance non offre dati realtime gratuiti)
- Selezione timeframe (1h, 4h, 1d, 1wk)
- Dashboard con storico predizioni
- Watchlist personale

### 💾 Gestione Dati
- Database Supabase per predizioni e watchlist
- Calcolo accuratezza ex-post (MAPE, direzione corretta)
- Backtest storico su predizioni passate
- Tracking performance modelli

## 🛠️ Stack Tecnico

- **Frontend**: React 19 + TanStack Router + TypeScript
- **Charts**: Lightweight Charts v5
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Backend**: TanStack Start (SSR-ready)
- **Database**: Supabase (PostgreSQL)
- **AI**: @ai-sdk/openai-compatible (modelli LLM)
- **Data Source**: Yahoo Finance API
- **State Management**: TanStack Query
- **Validation**: Zod

## 📋 Prerequisiti

- Node.js 18+
- npm o yarn
- Account Supabase (free tier)
- API key LLM (OpenAI-compatible) - opzionale, fallback automatico

## 🚀 Setup Locale

### 1. Clone e Install
```bash
git clone https://github.com/xrayeyes74/Candlesticks.git
cd Candlesticks
npm install
```

### 2. Configura Variabili d'Ambiente
```bash
cp .env.example .env.local
```

Edita `.env.local`:
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# LLM (opzionale - fallback se non configurato)
VITE_LLM_BASE_URL=http://localhost:8000/v1
VITE_LLM_API_KEY=sk-your-api-key
VITE_LLM_MODEL=gpt-3.5-turbo
```

### 3. Setup Supabase

Crea una nuova tabella nel tuo progetto Supabase:

```sql
-- Predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  current_price DECIMAL NOT NULL,
  predicted_price DECIMAL NOT NULL,
  actual_price DECIMAL,
  direction VARCHAR(10) NOT NULL,
  confidence DECIMAL NOT NULL,
  timeframe VARCHAR(20) NOT NULL,
  entry_price DECIMAL NOT NULL,
  stop_loss DECIMAL NOT NULL,
  take_profit DECIMAL NOT NULL,
  risk_reward_ratio DECIMAL NOT NULL,
  factors JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Watchlist table
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Enable RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can see own predictions"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
  ON predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own watchlist"
  ON watchlist FOR ALL
  USING (auth.uid() = user_id);
```

### 4. Avvia Dev Server
```bash
npm run dev
```

Server avviato su `http://localhost:5173`

### 5. Build per Produzione
```bash
npm run build
npm run preview
```

## 📖 Uso

### Analizzare un Titolo
1. Vai a `/chart`
2. Cerca il simbolo (es. AAPL, MSFT, TSLA)
3. Seleziona il timeframe desiderato
4. Visualizza:
   - Grafico candlestick con indicatori
   - Predizione AI nel pannello destro
   - Segnale di trading (BUY/SELL/HOLD)
   - Livelli di support/resistance
   - Analisi dettagliata dei fattori

### Salvare Predizioni
- Clicca "Salva Predizione" per registrare nel database
- Sarà possibile comparare con il prezzo reale per calcolare accuratezza

### Gestire Watchlist
- Clicca "Aggiungi a Watchlist"
- Accedi da `/watchlist` per vedere tutti i tuoi titoli salvati

## 🔧 Configurazione LLM

### Con OpenAI
```bash
export VITE_LLM_BASE_URL=https://api.openai.com/v1
export VITE_LLM_API_KEY=sk-...
export VITE_LLM_MODEL=gpt-4
```

### Con LM Studio (Local)
```bash
# Scarica LM Studio: https://lmstudio.ai/
# Avvia il server: LM Studio → Select Model → Start Server
export VITE_LLM_BASE_URL=http://localhost:1234/v1
export VITE_LLM_API_KEY=not-needed
export VITE_LLM_MODEL=local-model
```

### Senza LLM (Fallback)
Se non configurato, l'app utilizzerà analisi strutturata senza LLM.

## 📊 Struttura Progetto

```
src/
├── lib/
│   ├── technical-analysis.ts    # Calcolo indicatori (RSI, MACD, etc)
│   ├── ai-prediction.ts         # Engine predizione multi-fattore
│   ├── llm-analysis.ts          # Analisi LLM e segnali trading
│   ├── yahoo-finance.ts         # Fetching dati Yahoo Finance
│   └── supabase-service.ts      # Database layer
├── components/
│   ├── CandleChart.tsx          # Visualizzazione grafico
│   └── PredictionResults.tsx    # Mostra risultati predizione
├── routes/
│   ├── __root.tsx               # Root layout
│   ├── index.tsx                # Landing page
│   ├── chart.tsx                # Pagina analisi principale
│   ├── auth.tsx                 # Autenticazione (TODO)
│   └── api/
│       └── predict.ts           # API endpoint predizioni
└── integrations/
    └── supabase/
        └── client.ts            # Client Supabase
```

## 🧪 Testing

Analizza un titolo di test:
```bash
# AAPL con dati da Yahoo Finance
# Predizione automatica con 7 categorie di analisi
# Segnale di trading con position sizing
```

## 🐛 Troubleshooting

### "Insufficient data: need at least 50 candles"
- Il timeframe selezionato ha pochi dati storici
- Prova con `1d` (giornaliero) per più storia

### LLM non disponibile
- L'app continua a funzionare con fallback automatico
- Controlla `VITE_LLM_BASE_URL` e `VITE_LLM_API_KEY`

### Yahoo Finance timeout
- Alcune connessioni bloccano l'accesso
- Usa un proxy o VPN se necessario

### Supabase non disponibile
- Predizioni non saranno salvate
- Controlla credenziali in `.env.local`

## 📝 Prossimi Step

- [ ] Implementare autenticazione Supabase
- [ ] Aggiungere pagina dashboard con storico
- [ ] Implementare export predizioni (PDF/CSV)
- [ ] Aggiungere notifiche real-time per target raggiunti
- [ ] Integrare dati multiple fonti (Polygon, Alpaca)
- [ ] Migliorare modello LLM con fine-tuning su dati storici
- [ ] Aggiungere paper trading simulator
- [ ] Mobile app con React Native

## ⚖️ Disclaimer

**Strumento educativo solamente.** Non è consulenza finanziaria. Il trading comporta rischi significativi. Non investire denaro che non puoi permetterti di perdere. Le previsioni storiche non garantiscono risultati futuri. Consultare sempre un consulente finanziario qualificato.

Fonte dati: Yahoo Finance

## 📄 Licenza

MIT

## 👤 Author

[xrayeyes74](https://github.com/xrayeyes74)

---

**Domande?** Apri un issue su GitHub o contatta l'autore.
