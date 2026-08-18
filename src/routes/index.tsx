import { createFileRoute, Link } from "@tanstack/react-router";
import { CandlestickChart, TrendingUp, Brain, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <CandlestickChart className="h-5 w-5 text-primary" />
          <span>{t("common.appName")}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link to="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">{t("landing.cta")}</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-16 pb-24 text-center">
        <span className="inline-block rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
          {t("landing.badge")}
        </span>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          {t("landing.titleLine1")} <span className="text-primary">{t("landing.titleLine2")}</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("landing.subtitle")}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/dashboard" className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">{t("landing.start")}</Link>
          <a href="#features" className="rounded-md border border-border px-5 py-3 text-sm hover:bg-accent">{t("landing.howItWorks")}</a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 pb-24 grid gap-4 sm:grid-cols-3">
        <Feature icon={<TrendingUp />} title={t("landing.feature1Title")}>{t("landing.feature1Desc")}</Feature>
        <Feature icon={<CandlestickChart />} title={t("landing.feature2Title")}>{t("landing.feature2Desc")}</Feature>
        <Feature icon={<Brain />} title={t("landing.feature3Title")}>{t("landing.feature3Desc")}</Feature>
        <Feature icon={<History />} title={t("landing.feature4Title")}>{t("landing.feature4Desc")}</Feature>
        <Feature icon={<TrendingUp />} title={t("landing.feature5Title")}>{t("landing.feature5Desc")}</Feature>
        <Feature icon={<Brain />} title={t("landing.feature6Title")}>{t("landing.feature6Desc")}</Feature>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground text-center space-y-2">
          <p>{t("landing.footer")}</p>
          <p><Link to="/privacy" className="hover:underline">Privacy Policy</Link></p>
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
