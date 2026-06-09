import { Trophy, CalendarDays, LineChart, LayoutDashboard, Settings } from "lucide-react";
import { appLogoSrc } from "@/src/lib/brand";
import { useSupabase } from "@/src/lib/supabase-provider";

interface NavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function BottomNav({ activeTab, setActiveTab }: NavProps) {
  const { isAdmin } = useSupabase();
  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Inicio" },
    { id: "matches", icon: CalendarDays, label: "Jogos" },
    { id: "ranking", icon: Trophy, label: "Ranking" },
    { id: "stats", icon: LineChart, label: "Estatisticas" },
    { id: "admin", icon: Settings, label: "Admin" },
  ].filter((item) => item.id !== "admin" || isAdmin);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-slate-800 bg-[#0F172A] px-2 pb-safe md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex h-full w-16 flex-col items-center justify-center space-y-1 transition-colors ${
              isActive ? "text-yellow-500" : "text-slate-500 hover:text-white"
            }`}
          >
            <Icon className={`h-6 w-6 stroke-[1.5] ${isActive ? "stroke-[2]" : ""}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar({ activeTab, setActiveTab }: NavProps) {
  const { rankings, isAdmin, user } = useSupabase();
  const userPoints = rankings.find((ranking) => ranking.user_id === user?.id)?.total_points ?? 0;
  const progress = Math.min(100, Math.max(0, userPoints / 15));

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Inicio" },
    { id: "matches", icon: CalendarDays, label: "Palpites" },
    { id: "ranking", icon: Trophy, label: "Ranking" },
    { id: "stats", icon: LineChart, label: "Estatisticas" },
    { id: "admin", icon: Settings, label: "Admin & API" },
  ].filter((item) => item.id !== "admin" || isAdmin);

  return (
    <div className="hidden w-64 flex-col border-r border-slate-700/50 bg-[#1E293B] md:flex">
      <div className="flex h-20 items-center px-6 border-b border-slate-800">
        <img
          src={appLogoSrc}
          alt="Logo TecnoPerfil Bolao Copa 2026"
          className="h-14 w-auto object-contain"
        />
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                isActive ? "bg-slate-700/50 text-yellow-500" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="mr-3 h-5 w-5 stroke-[2]" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-auto p-6">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 text-left">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            Pontuacao Total
          </p>
          <p className="text-2xl font-black text-white">
            {userPoints.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal text-yellow-500">pts</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div className="h-full bg-yellow-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
