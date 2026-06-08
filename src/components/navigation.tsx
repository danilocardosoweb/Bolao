import { Trophy, CalendarDays, LineChart, LayoutDashboard, Settings } from "lucide-react";

interface NavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function BottomNav({ activeTab, setActiveTab }: NavProps) {
  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Início" },
    { id: "matches", icon: CalendarDays, label: "Jogos" },
    { id: "ranking", icon: Trophy, label: "Ranking" },
    { id: "stats", icon: LineChart, label: "Estatísticas" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-slate-800 bg-[#0F172A] px-2 pb-safe md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center space-y-1 w-16 h-full transition-colors ${
              isActive ? "text-yellow-500" : "text-slate-500 hover:text-white"
            }`}
          >
            <Icon className={`w-6 h-6 stroke-[1.5] ${isActive ? "stroke-[2]" : ""}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Sidebar({ activeTab, setActiveTab }: NavProps) {
  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Início" },
    { id: "matches", icon: CalendarDays, label: "Palpites" },
    { id: "ranking", icon: Trophy, label: "Ranking" },
    { id: "stats", icon: LineChart, label: "Estatísticas" },
    { id: "admin", icon: Settings, label: "Admin & API" },
  ];

  return (
    <div className="hidden w-64 flex-col border-r border-slate-700/50 bg-[#1E293B] md:flex">
      <div className="flex h-20 items-center px-6 border-b border-slate-800">
        <div className="bg-yellow-500 p-1.5 rounded-lg mr-3">
          <Trophy className="w-5 h-5 text-slate-900" />
        </div>
        <span className="text-xl font-black tracking-tighter uppercase whitespace-nowrap">Bolão <span className="text-yellow-500">Copa 26</span></span>
      </div>
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                isActive 
                  ? "bg-slate-700/50 text-yellow-500" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 mr-3 stroke-[2]" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="p-6 mt-auto">
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 text-left">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-bold">Pontuação Total</p>
          <p className="text-2xl font-black text-white">1.240 <span className="text-sm font-normal text-yellow-500">pts</span></p>
          <div className="mt-3 bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div className="bg-yellow-500 h-full w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
