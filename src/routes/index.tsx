import { createFileRoute, Link } from "@tanstack/react-router";
import { CandlestickChart, TrendingUp, Brain, History } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Candlestick AI — Analisi tecnica e previsioni AI di titoli" },
      { name: "description", content: "Analisi tecnica automatica, riconoscimento pattern candlestick, previsioni AI grafiche e backtest storico su titoli di borsa." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <CandlestickChart className="h-5 w-5 text-primary" />
          <span>Candlestick AI</span>
        </div>
        <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Entra</Link>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-16 pb-24 text-center">
        <span className="inline-block rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
          Analisi tecnica · Pattern · Previsione AI · Backtest
        </span>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          Leggi il grafico. <span className="text-primary">Prevedi la mossa.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Grafici a candele, indicatori classici, riconoscimento di pattern candlestick e una AI che estende visivamente il grafico con la sua previsione. Poi confrontala con l'andamento reale.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth" className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Inizia gratis</Link>
          <a href="#features" className="rounded-md border border-border px-5 py-3 text-sm hover:bg-accent">Come funziona</a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 pb-24 grid gap-4 sm:grid-cols-3">
        <Feature icon={<TrendingUp />} title="Indicatori tecnici">RSI, MACD, medie mobili, Bollinger, stocastico — con segnali buy/sell/hold automatici.</Feature>
        <Feature icon={<CandlestickChart />} title="Pattern candlestick">Doji, hammer, engulfing, morning/evening star, tre soldati bianchi e altri, rilevati sulle ultime candele.</Feature>
        <Feature icon={<Brain />} title="Previsione AI grafica">Un modello AI prosegue il tuo grafico con N candele previste sovrapposte al reale.</Feature>
        <Feature icon={<History />} title="Backtest storico">Scegli una data passata, genera la previsione di allora, confronta con quello che è successo.</Feature>
        <Feature icon={<TrendingUp />} title="Watchlist personale">Salva i tuoi titoli e apri l'analisi con un click.</Feature>
        <Feature icon={<Brain />} title="Accuratezza cumulativa">Ogni previsione salvata viene valutata ex-post: MAPE, direzione corretta, errore massimo.</Feature>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground text-center">
          Strumento educativo. Non è consulenza finanziaria. Fonte dati: Yahoo Finance.
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
