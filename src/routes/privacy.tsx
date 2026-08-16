import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CandlestickChart, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({ meta: [{ title: "Privacy Policy — Candlestick AI" }] }),
});

// Contact used throughout the policy. Change this to your real support email
// before publishing — Google Play requires a working contact channel.
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
          <ArrowLeft className="h-4 w-4" /> {isItalian ? "Home" : "Home"}
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
        Questa informativa descrive quali dati raccoglie Candlestick AI ("l'app"), come vengono usati e con chi vengono
        condivisi. Usando l'app accetti le pratiche descritte qui sotto.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Titolare del trattamento</h2>
        <p>
          Per qualsiasi domanda su questa informativa o sui tuoi dati, puoi scrivere a: <strong>{CONTACT_EMAIL}</strong>.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Dati che raccogliamo</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dati account:</strong> email e password (o dati base del profilo Google se accedi con Google), gestiti tramite Supabase Auth.</li>
          <li><strong>Dati d'uso dell'app:</strong> simboli/titoli che analizzi, watchlist salvata, previsioni salvate (inclusi valori numerici, orizzonte temporale, e il testo generato dall'AI).</li>
          <li><strong>Foto caricate (funzione opzionale):</strong> se usi "Inserimento manuale → Carica foto", l'immagine viene inviata a un servizio di intelligenza artificiale per l'elaborazione (vedi punto 3) e <strong>non viene conservata sui nostri server</strong> dopo l'elaborazione — solo i valori numerici che scegli di salvare vengono mantenuti.</li>
          <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di dispositivo, identificativi pubblicitari (solo se usi la versione app con annunci), raccolti automaticamente per il funzionamento del servizio e della pubblicità.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Servizi di terze parti con cui condividiamo dati</h2>
        <p>Per far funzionare l'app, alcuni dati vengono inviati a questi fornitori, ciascuno con la propria informativa privacy:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase</strong> — hosting del database e autenticazione utenti.</li>
          <li><strong>Vercel</strong> — hosting dell'applicazione web.</li>
          <li><strong>Twelve Data</strong> — fornisce i dati di mercato (prezzi storici, quotazioni); riceve il simbolo del titolo che cerchi o analizzi, non dati che ti identificano personalmente.</li>
          <li><strong>Groq</strong> — genera le previsioni AI; riceve i dati storici dei prezzi e degli indicatori tecnici del titolo analizzato, non dati che ti identificano personalmente.</li>
          <li><strong>Google Gemini</strong> — usato solo se carichi una foto di un grafico; riceve l'immagine caricata per stimarne i valori.</li>
          <li><strong>Google AdMob</strong> — se usi la versione con annunci pubblicitari, raccoglie identificativi pubblicitari, indirizzo IP e dati d'interazione con gli annunci per mostrare pubblicità pertinente. Puoi gestire le preferenze pubblicitarie dalle impostazioni del tuo dispositivo Android (Google → Annunci).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">4. Perché usiamo questi dati</h2>
        <p>
          Esclusivamente per fornire le funzionalità dell'app: mostrarti dati di mercato, generare previsioni AI,
          salvare la tua watchlist e le previsioni, farti accedere in sicurezza, e (solo nella versione con annunci)
          mostrarti pubblicità. Non vendiamo i tuoi dati personali a terzi.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Conservazione e cancellazione dei dati</h2>
        <p>
          I dati del tuo account (watchlist, previsioni salvate) restano fino a quando non richiedi la cancellazione.
          Per cancellare il tuo account e tutti i dati associati, scrivi a <strong>{CONTACT_EMAIL}</strong> — la richiesta
          verrà evasa entro un tempo ragionevole.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Sicurezza</h2>
        <p>
          I dati sono protetti tramite connessioni cifrate (HTTPS) e regole di accesso a livello di riga (Row Level
          Security) sul database, che impediscono a un utente di vedere i dati di un altro utente.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">7. Età minima</h2>
        <p>
          L'app non è destinata a minori di 18 anni e non raccoglie consapevolmente dati da minori. Se sei un genitore
          e ritieni che tuo figlio ci abbia fornito dati personali, contattaci per la rimozione.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">8. I tuoi diritti</h2>
        <p>
          Puoi richiedere in qualsiasi momento l'accesso, la correzione o la cancellazione dei tuoi dati personali
          scrivendo a <strong>{CONTACT_EMAIL}</strong>. Se ti trovi nell'Unione Europea, hai i diritti previsti dal
          Regolamento Generale sulla Protezione dei Dati (GDPR).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">9. Modifiche a questa informativa</h2>
        <p>
          Possiamo aggiornare questa informativa nel tempo. La data di "ultimo aggiornamento" in cima alla pagina
          riflette l'ultima revisione.
        </p>
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
        This policy describes what data Candlestick AI ("the app") collects, how it's used, and who it's shared
        with. By using the app you agree to the practices described below.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Data controller</h2>
        <p>For any question about this policy or your data, contact: <strong>{CONTACT_EMAIL}</strong>.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Data we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> email and password (or basic Google profile data if you sign in with Google), managed via Supabase Auth.</li>
          <li><strong>App usage data:</strong> symbols/stocks you analyze, your saved watchlist, saved predictions (including numeric values, time horizon, and AI-generated text).</li>
          <li><strong>Uploaded photos (optional feature):</strong> if you use "Manual entry → Load photo", the image is sent to an AI service for processing (see section 3) and <strong>is not stored on our servers</strong> after processing — only the numeric values you choose to save are kept.</li>
          <li><strong>Technical data:</strong> IP address, device type, advertising identifiers (only in the ad-supported version), collected automatically to operate the service and ads.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Third-party services we share data with</h2>
        <p>To make the app work, some data is sent to these providers, each with its own privacy policy:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase</strong> — database hosting and user authentication.</li>
          <li><strong>Vercel</strong> — web application hosting.</li>
          <li><strong>Twelve Data</strong> — provides market data (historical prices, quotes); receives the symbol you search or analyze, not personally identifying data.</li>
          <li><strong>Groq</strong> — generates AI forecasts; receives historical price data and technical indicators for the analyzed symbol, not personally identifying data.</li>
          <li><strong>Google Gemini</strong> — used only if you upload a chart photo; receives the uploaded image to estimate its values.</li>
          <li><strong>Google AdMob</strong> — if you use the ad-supported version, it collects advertising identifiers, IP address, and ad interaction data to show relevant ads. You can manage ad preferences from your Android device settings (Google → Ads).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">4. Why we use this data</h2>
        <p>
          Exclusively to provide the app's features: showing you market data, generating AI forecasts, saving your
          watchlist and predictions, letting you sign in securely, and (ad-supported version only) showing ads. We
          do not sell your personal data to third parties.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Data retention and deletion</h2>
        <p>
          Your account data (watchlist, saved predictions) is kept until you request deletion. To delete your
          account and all associated data, write to <strong>{CONTACT_EMAIL}</strong> — the request will be processed
          within a reasonable time.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Security</h2>
        <p>
          Data is protected via encrypted connections (HTTPS) and Row Level Security rules on the database, which
          prevent one user from seeing another user's data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">7. Minimum age</h2>
        <p>
          The app is not intended for anyone under 18 and does not knowingly collect data from minors. If you are a
          parent and believe your child has provided us with personal data, contact us for removal.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">8. Your rights</h2>
        <p>
          You can request access, correction, or deletion of your personal data at any time by writing to{" "}
          <strong>{CONTACT_EMAIL}</strong>. If you are in the European Union, you have rights under the General Data
          Protection Regulation (GDPR).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">9. Changes to this policy</h2>
        <p>
          We may update this policy over time. The "last updated" date at the top of the page reflects the latest
          revision.
        </p>
      </section>

      <p className="text-xs pt-4 border-t border-border">
        Candlestick AI is an educational technical-analysis tool. Forecasts are AI-generated and do not constitute
        financial advice.
      </p>
    </div>
  );
}
