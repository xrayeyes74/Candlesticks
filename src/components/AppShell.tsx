import { Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CandlestickChart, LineChart, LayoutDashboard, History, LogOut, ImagePlus, Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

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
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[180px]">{email}</span>
            <button onClick={signOut} className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
              <LogOut className="h-3.5 w-3.5" /> {t("common.logout")}
            </button>
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
            <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-left hover:bg-accent">
              <LogOut className="h-3.5 w-3.5" /> {t("common.logout")}
            </button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground">
        <LineChart className="inline h-3 w-3 mr-1" />
        {t("common.disclaimer")}
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
