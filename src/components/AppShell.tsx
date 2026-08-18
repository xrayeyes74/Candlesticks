import { Link } from "@tanstack/react-router";
import { CandlestickChart, LayoutDashboard, History, ImagePlus, Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 backdrop-blur bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
            <CandlestickChart className="h-5 w-5 text-primary" />
            <span>{t("common.appName")}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>{t("nav.dashboard")}</NavLink>
            <NavLink to="/manual" icon={<ImagePlus className="h-4 w-4" />}>{t("nav.manual")}</NavLink>
            <NavLink to="/predictions" icon={<History className="h-4 w-4" />}>{t("nav.predictions")}</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menu"
              className="md:hidden inline-flex items-center justify-center rounded-md border border-border p-2 hover:bg-accent"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border/60 bg-background/95 px-4 py-2 flex flex-col gap-1 text-sm">
            <NavLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => setMobileMenuOpen(false)}>{t("nav.dashboard")}</NavLink>
            <NavLink to="/manual" icon={<ImagePlus className="h-4 w-4" />} onClick={() => setMobileMenuOpen(false)}>{t("nav.manual")}</NavLink>
            <NavLink to="/predictions" icon={<History className="h-4 w-4" />} onClick={() => setMobileMenuOpen(false)}>{t("nav.predictions")}</NavLink>
            <div className="px-3 py-2"><LanguageSwitcher /></div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 pb-20">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-xs font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-400/90">
        {t("common.legalBanner")}
      </footer>
    </div>
  );
}

function NavLink({ to, icon, children, onClick }: { to: string; icon: ReactNode; children: ReactNode; onClick?: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground">
      {icon}{children}
    </Link>
  );
}
