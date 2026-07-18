import { Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CandlestickChart, LineChart, LayoutDashboard, History, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string>("");

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
            <span>Candlestick AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavLink>
            <NavLink to="/predictions" icon={<History className="h-4 w-4" />}>Previsioni</NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[180px]">{email}</span>
            <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
              <LogOut className="h-3.5 w-3.5" /> Esci
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-muted-foreground">
        <LineChart className="inline h-3 w-3 mr-1" />
        Le analisi e le previsioni non costituiscono consulenza finanziaria.
      </footer>
    </div>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground">
      {icon}{children}
    </Link>
  );
}
