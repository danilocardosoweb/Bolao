import { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar, BottomNav } from './components/navigation';
import { DashboardView } from './features/dashboard/DashboardView';
import { MatchesView } from './features/matches/MatchesView';
import { RankingView } from './features/rankings/RankingView';
import { AdminDashboardView } from './features/admin/AdminDashboardView';
import { LandingPage } from './features/landing/LandingPage';
import { LineChart, PencilLine, Trophy } from 'lucide-react';
import { useSupabase } from './lib/supabase-provider';
import type { User } from '@supabase/supabase-js';

type AppTab = "dashboard" | "matches" | "ranking" | "stats" | "admin";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const { matches, user, signOut, updateProfileName, isAdmin } = useSupabase();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const liveMatchCount = matches.filter((match) => ["LIVE", "1H", "HT", "2H", "ET", "BT", "P"].includes(match.status)).length;
  const headerBadge = liveMatchCount > 0 ? "AO VIVO" : "AGENDA OFICIAL";
  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  useEffect(() => {
    setProfileNameDraft(displayName);
  }, [displayName]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideDesktop = desktopMenuRef.current?.contains(target);
      const insideMobile = mobileMenuRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setAccountMenuOpen(false);
      }
    }

    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  const openApp = (tab: AppTab = "dashboard") => {
    setShowLanding(false);
    setActiveTab(tab);
  };

  if (showLanding) {
    return (
      <LandingPage
        onEnterApp={() => openApp("dashboard")}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "matches":
        return <MatchesView />;
      case "ranking":
        return <RankingView />;
      case "admin":
        if (!isAdmin) return <DashboardView />;
        return <AdminDashboardView />;
      case "stats":
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <div className="bg-muted p-6 rounded-full">
              <LineChart className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Estatisticas</h2>
            <p className="text-muted-foreground max-w-sm text-center">
              Graficos de aproveitamento e simuladores estarao disponiveis quando os primeiros jogos terminarem.
            </p>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground dark">
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as AppTab)} />

      <main className="flex-1 flex flex-col min-w-0 bg-[#0F172A]">
        <header className="h-16 flex items-center justify-between px-4 md:px-8 shrink-0 md:hidden border-b border-slate-800 bg-[#0F172A]">
          <button className="flex items-center gap-2" onClick={() => setShowLanding(true)}>
            <div className="bg-yellow-500 p-1 rounded-md">
              <Trophy className="w-4 h-4 text-slate-900" />
            </div>
            <span className="block font-black tracking-tighter uppercase whitespace-nowrap">TecnoPerfil <span className="text-yellow-500">Copa 26</span></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-500 flex items-center justify-center overflow-hidden font-bold text-slate-900 text-xs shadow-sm">
            CP
          </div>
        </header>

        <header className="h-20 bg-[#0F172A] border-b border-slate-800 hidden md:flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button className="text-left text-xl font-bold" onClick={() => setShowLanding(true)}>
              {activeTab === 'dashboard' && 'Dashboard Geral'}
              {activeTab === 'matches' && 'Proximos Jogos'}
              {activeTab === 'ranking' && 'Rankings Oficiais'}
              {activeTab === 'stats' && 'Estatisticas'}
              {activeTab === 'admin' && 'Painel Admin & API'}
            </button>
            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20">
              {headerBadge}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative" ref={desktopMenuRef}>
              <button
                className="flex items-center gap-3 bg-slate-800 p-1.5 pr-4 rounded-full border border-slate-700 transition-colors hover:bg-slate-700"
                onClick={() => setAccountMenuOpen((current) => !current)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-slate-900 text-xs">
                  {initials}
                </div>
                <span className="font-semibold text-sm">{displayName}</span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-14 z-50 w-80 rounded-3xl border border-slate-700 bg-[#111a2f] p-4 shadow-2xl">
                  <div className="mb-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Conta</div>
                    <div className="mt-1 text-lg font-bold text-white">{displayName}</div>
                    <div className="text-sm text-slate-400">{user?.email}</div>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Nome para exibição
                    </span>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2">
                      <PencilLine className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        value={profileNameDraft}
                        onChange={(event) => setProfileNameDraft(event.target.value)}
                        className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
                        placeholder="Seu nome"
                      />
                    </div>
                  </label>

                  <div className="mt-4 flex gap-3">
                    <button
                      className="flex-1 rounded-2xl bg-yellow-500 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                      disabled={savingProfile}
                      onClick={async () => {
                        setSavingProfile(true);
                        const result = await updateProfileName(profileNameDraft);
                        setSavingProfile(false);
                        if (!result.error) {
                          setAccountMenuOpen(false);
                        }
                      }}
                    >
                      {savingProfile ? "Salvando..." : "Salvar nome"}
                    </button>
                    <button
                      className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-slate-800"
                      onClick={async () => {
                        setAccountMenuOpen(false);
                        await signOut();
                        setShowLanding(true);
                        setActiveTab("dashboard");
                      }}
                    >
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto pb-24 md:pb-0">
          <div className="mx-auto max-w-6xl p-4 md:p-8 mt-2 md:mt-0">
            {renderContent()}
          </div>
        </div>

        <footer className="bg-slate-900 h-14 border-t border-slate-800 px-4 md:px-8 hidden md:flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{matches.length > 0 ? "Dados oficiais carregados" : "Aguardando sincronizacao"}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 uppercase tracking-tighter">
            <span>{matches.length} jogos</span>
            <span className="text-slate-700">|</span>
            <span>Calendario oficial 2026</span>
          </div>
        </footer>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as AppTab)} />
    </div>
  );
}

function getDisplayName(user: User | null) {
  if (!user) return "Convidado";
  const fullName = (user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
  if (fullName) return fullName;
  if (user.email) return user.email.split("@")[0];
  return "Convidado";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
