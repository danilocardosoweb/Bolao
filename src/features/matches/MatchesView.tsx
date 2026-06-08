import { useState, useMemo } from "react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Lock, Save, AlertCircle } from "lucide-react";
import { useSupabase } from "@/src/lib/supabase-provider";

import { calculateMatchScore, MatchStage } from "@/src/lib/scoring";

export function MatchesView() {
  const [filter, setFilter] = useState<"all" | "pending" | "finished">("pending");
  const { matches, loading, error } = useSupabase();

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }, [matches]);

  const filteredMatches = sortedMatches.filter((match) => {
    const isFinished = ["FT", "AET", "PEN"].includes(match.status);
    if (filter === "pending") return !isFinished;
    if (filter === "finished") return isFinished;
    return true;
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">Próximos Jogos</h1>
        </div>
        
        <div className="flex bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto min-w-0">
          <button 
            onClick={() => setFilter("all")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${filter === 'all' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter("pending")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${filter === 'pending' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            Abertos
          </button>
          <button 
            onClick={() => setFilter("finished")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${filter === 'finished' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            Encerrados
          </button>
        </div>
      </div>

      {loading && (
         <div className="flex justify-center items-center h-32">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
         </div>
      )}
      
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>Erro ao carregar jogos: {error}</span>
        </div>
      )}
      
      {!loading && !error && filteredMatches.length === 0 && (
         <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-3xl text-center flex flex-col items-center justify-center">
             <span className="text-4xl mb-4">📅</span>
             <h3 className="text-lg font-bold text-white mb-2">Nenhum jogo encontrado.</h3>
             <p className="text-slate-400">Sincronize os dados no painel administrativo.</p>
         </div>
      )}

      <div className="grid gap-4 md:gap-6">
        {filteredMatches.map(match => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  const dateStr = new Date(match.match_date).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace('.,', ' •');

  const isFinished = ["FT", "AET", "PEN"].includes(match.status);
  const isLive = ["LIVE", "1H", "HT", "2H", "ET", "BT", "P"].includes(match.status);
  const isOpen = ["NS", "TBD"].includes(match.status);

  // Predictions are not fully integrated into standard user view yet
  // We leave them open unless finished
  const predA = '';
  const predB = '';
  
  return (
    <Card className={`overflow-hidden transition-all border-slate-700/50 rounded-3xl ${isFinished ? 'opacity-80 bg-slate-900/50' : 'bg-gradient-to-r from-indigo-900/60 to-indigo-800/40 relative shadow-xl'}`}>
      {!isFinished && (
         <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/5 rounded-full blur-3xl z-0 pointer-events-none"></div>
      )}
      <CardContent className="p-4 md:p-8 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
            <span className="px-3 py-1 bg-white/10 backdrop-blur text-[10px] font-black rounded-full uppercase tracking-widest text-[#cbd5e1] border border-white/5">
               {match.stage === 'group_stage' ? 'Fase de Grupos' : match.stage || match.group_name}
            </span>
            <span className="text-xs text-indigo-300 font-bold uppercase tracking-widest">{dateStr} • {match.stadium} • {match.city}</span>
          </div>
          {isFinished ? (
            <Badge variant="outline" className="text-slate-500 border-slate-700 bg-slate-800 flex items-center">
              <Lock className="w-3 h-3 mr-1" /> Encerrado
            </Badge>
          ) : isLive ? (
            <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full animate-pulse border border-green-500/20">AO VIVO</span>
          ) : (
            <span className="text-xs font-bold text-yellow-500">ABERTO</span>
          )}
        </div>

        {/* Real result indicator if finished or live */}
        {(isFinished || isLive) && (
          <div className="w-full flex justify-center mb-2">
             <div className="bg-slate-950 border border-slate-800 px-4 py-1.5 rounded-full flex flex-col items-center">
               <span className="text-[10px] uppercase text-slate-500 font-bold">{isLive ? 'Placar Atual' : 'Resultado Oficial'}</span>
               <span className="text-white font-black text-sm flex items-center gap-2">
                  <TeamFlag flag={match.team_a_flag} /> 
                  <span className="text-yellow-500 mx-1">{match.home_goals ?? 0} x {match.away_goals ?? 0}</span> 
                  <TeamFlag flag={match.team_b_flag} />
               </span>
             </div>
          </div>
        )}

        {/* Teams and Score Input */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 py-2">
          
          <div className="flex items-center justify-between w-full lg:flex-1">
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <TeamFlag flag={match.team_a_flag} size="lg" />
              <span className="font-black text-lg md:text-xl text-white uppercase tracking-tight">{match.team_a_name || match.team_a_code}</span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <Input 
                type="text" 
                maxLength={2}
                disabled={isFinished}
                defaultValue={predA}
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 text-center text-2xl md:text-3xl font-black bg-slate-900/80 border-2 border-slate-600 focus-visible:border-yellow-500 disabled:opacity-100 text-white rounded-2xl transition-colors shrink-0"
                placeholder="-"
              />
              <span className="text-white/50 font-black text-xl md:text-2xl px-1 sm:px-2 shrink-0">X</span>
              <Input 
                type="text"
                maxLength={2}
                disabled={isFinished}
                defaultValue={predB}
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 text-center text-2xl md:text-3xl font-black bg-slate-900/80 border-2 border-slate-600 focus-visible:border-yellow-500 disabled:opacity-100 text-white rounded-2xl transition-colors shrink-0"
                placeholder="-"
              />
            </div>

            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <TeamFlag flag={match.team_b_flag} size="lg" />
              <span className="font-black text-lg md:text-xl text-white uppercase tracking-tight">{match.team_b_name || match.team_b_code}</span>
            </div>
          </div>

          {!isFinished && (
            <div className="w-full lg:w-48 lg:border-l border-white/10 lg:pl-8 flex justify-center mt-4 lg:mt-0">
              <Button className="w-full h-14 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase tracking-tight rounded-xl shadow-lg transition-transform active:scale-95 text-sm">
                Salvar Palpite
              </Button>
            </div>
          )}
          
        </div>
        
      </CardContent>
    </Card>
  );
}

function TeamFlag({ flag, size = 'sm' }: { flag: string | null; size?: 'sm' | 'lg' }) {
  if (!flag) return <span className={size === 'lg' ? "text-5xl md:text-6xl" : "text-xl"}>🏳️</span>;
  if (flag.startsWith('http')) {
     return <img src={flag} alt="flag" className={`object-contain ${size === 'lg' ? "w-16 h-16 md:w-20 md:h-20 mb-2 drop-shadow-lg" : "w-6 h-6 rounded-sm inline-block"}`} />;
  }
  return <span className={size === 'lg' ? "text-5xl md:text-6xl drop-shadow-lg mb-2 inline-block" : "text-xl inline-block"}>{flag}</span>;
}
