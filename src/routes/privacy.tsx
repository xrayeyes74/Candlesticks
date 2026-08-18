import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CandlestickChart, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({ meta: [{ title: "Privacy Policy — Candlestick AI" }] }),
});

const CONTACT_EMAIL = "xrayeyes74@gmail.com";
const LAST_UPDATED = "16 agosto 2026";

function PrivacyPage() {
  const { i18n } = useTranslation();
  const isItalian = i18n.language === "it";

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-3xl px-4 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <CandlestickChart className="h-5 w-5 text-primary" />
          <span>Candlestick AI</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 prose prose-invert prose-sm sm:prose-base">
        {isItalian ? <PrivacyIT /> : <PrivacyEN />}
      </main>
    </div>
  );
}

function PrivacyIT() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Informativa sulla Privacy</h1>
        <p className="mt-1 text-xs">Ultimo aggiornamento: {LAST_UPDATED}</p>
      </div>

      <p>
        Candlestick AI ("l'app") <strong>non richiede un account e non ha un proprio server dove salvare i tuoi dati
        personali</strong>. Questa informativa spiega esattamente quali dati passano attraverso l'app e dove vanno a finire.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Contatto</h2>
        <p>Per qualsiasi domanda su questa informativa, scrivi a: <strong>{CONTACT_EMAIL}</strong>.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Dati salvati solo sul tuo dispositivo</h2>
        <p>
          La tua watchlist e le previsioni che salvi restano <strong>esclusivamente nella memoria locale del tuo
          browser/dispositivo</strong> (localStorage) — non vengono mai inviati o salvati su nessun server. Se disinstalli
          l'app o cancelli i dati del browser, questi dati vengono persi in modo permanente e noi non possiamo recuperarli
          (perché non li abbiamo mai avuti).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Dati inviati a servizi di terze parti (per far funzionare l'app)</h2>
        <p>Quando usi le funzioni dell'app, alcuni dati vengono inviati temporaneamente a questi fornitori, solo per l'elaborazione della singola richiesta — non li conserviamo noi:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Vercel</strong> — hosting dell'applicazione web.</li>
          <li><strong>Twelve Data</strong> — riceve il simbolo del titolo che cerchi o analizzi, per fornirti dati di mercato.</li>
          <li><strong>Groq</strong> — riceve i dati storici dei prezzi e degli indicatori tecnici del titolo analizzato, per generare la previsione AI.</li>
          <li><strong>Google Gemini</strong> — usato solo se carichi una foto di un grafico; riceve l'immagine per stimarne i valori.</li>
          <li><strong>Google AdMob</strong> — se usi la versione con annunci, raccoglie identificativi pubblicitari, indirizzo IP e dati d'interazione con gli annunci. Puoi gestire le preferenze pubblicitarie dalle impostazioni del tuo dispositivo Android (Google → Annunci).</li>
        </ul>
        <p>Nessuno di questi dati è collegato a un tuo account, perché l'app non ne ha uno.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">4. Sicurezza</h2>
        <p>Tutte le comunicazioni con l'app avvengono tramite connessioni cifrate (HTTPS).</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Età minima</h2>
        <p>L'app non è destinata a minori di 18 anni.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Modifiche a questa informativa</h2>
        <p>Possiamo aggiornare questa informativa nel tempo. La data di "ultimo aggiornamento" in cima alla pagina riflette l'ultima revisione.</p>
      </section>

      <p className="text-xs pt-4 border-t border-border">
        Candlestick AI è uno strumento educativo di analisi tecnica. Le previsioni sono generate da intelligenza
        artificiale e non costituiscono consulenza finanziaria.
      </p>
    </div>
  );
}

function PrivacyEN() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-1 text-xs">Last updated: {LAST_UPDATED}</p>
      </div>

      <p>
        Candlestick AI ("the app") <strong>does not require an account and has no server of its own where your
        personal data is stored</strong>. This policy explains exactly what data flows through the app and where it goes.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Contact</h2>
        <p>For any question about this policy, write to: <strong>{CONTACT_EMAIL}</strong>.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Data kept only on your device</h2>
        <p>
          Your watchlist and saved predictions live <strong>exclusively in your browser/device's local storage</strong> —
          they are never sent to or stored on any server. If you uninstall the app or clear your browser data, this
          data is permanently lost and we cannot recover it (because we never had it).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Data sent to third-party services (to make the app work)</h2>
        <p>When you use the app's features, some data is sent temporarily to these providers, only to process that specific request — we don't keep it ourselves:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Vercel</strong> — web application hosting.</li>
          <li><strong>Twelve Data</strong> — receives the symbol you search or analyze, to provide market data.</li>
          <li><strong>Groq</strong> — receives historical price data and technical indicators for the analyzed symbol, to generate the AI forecast.</li>
          <li><strong>Google Gemini</strong> — used only if you upload a chart photo; receives the image to estimate its values.</li>
          <li><strong>Google AdMob</strong> — if you use the ad-supported version, it collects advertising identifiers, IP address, and ad interaction data. You can manage ad preferences from your Android device settings (Google → Ads).</li>
        </ul>
        <p>None of this data is linked to an account, because the app doesn't have one.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">4. Security</h2>
        <p>All communication with the app happens over encrypted connections (HTTPS).</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Minimum age</h2>
        <p>The app is not intended for anyone under 18.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Changes to this policy</h2>
        <p>We may update this policy over time. The "last updated" date at the top of the page reflects the latest revision.</p>
      </section>

      <p className="text-xs pt-4 border-t border-border">
        Candlestick AI is an educational technical-analysis tool. Forecasts are AI-generated and do not constitute
        financial advice.
      </p>
    </div>
  );
}
