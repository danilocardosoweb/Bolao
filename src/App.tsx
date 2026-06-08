import { useState } from 'react';
import { Sidebar, BottomNav } from './components/navigation';
import { DashboardView } from './features/dashboard/DashboardView';
import { MatchesView } from './features/matches/MatchesView';
import { RankingView } from './features/rankings/RankingView';
import { AdminDashboardView } from './features/admin/AdminDashboardView';
import { Card, CardContent } from './components/ui/card';
import { LineChart, Trophy } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "matches":
        return <MatchesView />;
      case "ranking":
        return <RankingView />;
      case "admin":
        return <AdminDashboardView />;
      case "stats":
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
            <div className="bg-muted p-6 rounded-full">
              <LineChart className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Estatísticas</h2>
            <p className="text-muted-foreground max-w-sm text-center">
              Gráficos de aproveitamento e simuladores estarão disponíveis quando os primeiros jogos terminarem.
            </p>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground dark">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0 bg-[#0F172A]">
        {/* Mobile Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 shrink-0 md:hidden border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-500 p-1 rounded-md">
              <Trophy className="w-4 h-4 text-slate-900" />
            </div>
            <span className="block font-black tracking-tighter uppercase whitespace-nowrap">Bolão <span className="text-yellow-500">Copa 26</span></span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-500 flex items-center justify-center overflow-hidden font-bold text-slate-900 text-xs shadow-sm">
            UID
          </div>
        </header>

        {/* Desktop Header */}
        <header className="h-20 bg-[#0F172A] border-b border-slate-800 hidden md:flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">
              {activeTab === 'dashboard' && 'Dashboard Geral'}
              {activeTab === 'matches' && 'Próximos Jogos'}
              {activeTab === 'ranking' && 'Rankings Oficiais'}
              {activeTab === 'stats' && 'Estatísticas'}
              {activeTab === 'admin' && 'Painel Admin & API'}
            </h1>
            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20">AO VIVO</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-slate-800 p-1.5 pr-4 rounded-full border border-slate-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-slate-900">UID</div>
              <span className="font-semibold text-sm">Participante</span>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto pb-24 md:pb-0">
          <div className="mx-auto max-w-6xl p-4 md:p-8 mt-2 md:mt-0">
            {renderContent()}
          </div>
        </div>

        {/* Quick Stats Footer */}
        <footer className="bg-slate-900 h-14 border-t border-slate-800 px-4 md:px-8 hidden md:flex items-center justify-between text-xs text-slate-500 font-medium shrink-0">
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Sistema Online</span>
            </div>
          </div>
          <div className="flex items-center gap-4 uppercase tracking-tighter">
            <span>v2.0.26-BETA</span>
            <span className="text-slate-700">|</span>
            <span>© 2026 FIFA World Cup™ Pool Platform</span>
          </div>
        </footer>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
