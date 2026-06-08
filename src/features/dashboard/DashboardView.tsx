import { Trophy, TrendingUp, CheckCircle2, Activity } from "lucide-react";
import { useSupabase } from "@/src/lib/supabase-provider";
import { useMemo } from "react";

const OPEN_MATCH_STATUSES = ["NS", "TBD", "SCHEDULED", "TIMED"];

export function DashboardView() {
  const { matches, rankings, loading, user } = useSupabase();

  const userRankIndex = rankings.findIndex((ranking) => ranking.user_id === user?.id);
  const userRank = userRankIndex >= 0 ? rankings[userRankIndex] : null;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const nextMatch = useMemo(() => {
    const pending = matches.filter((m) => OPEN_MATCH_STATUSES.includes(m.status));
    pending.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
    return pending.length > 0 ? pending[0] : null;
  }, [matches]);

  if (loading) {
     return <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header/Hero Section */}
      <section className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-white">Visão Geral</h1>
        {displayName ? (
          <p className="text-slate-400 text-sm md:text-base">Bem-vindo de volta, {displayName}. Acompanhe seu desempenho no desafio TecnoPerfil da Copa.</p>
        ) : (
          <p className="text-slate-400 text-sm md:text-base">Acompanhe seu desempenho no desafio TecnoPerfil da Copa.</p>
        )}
      </section>

      {/* Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Desempenho</span>
            <Trophy className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="text-3xl font-black text-white">{userRank?.total_points || 0} <span className="text-sm text-slate-500 font-medium">pts</span></div>
          <div className="text-sm font-bold text-green-400 mt-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" /> {userRank ? `${userRankIndex + 1}º Lugar Oficial` : "Sem pontuação ainda"}
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aproveitamento</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-2xl font-black text-white">{userRank?.exact_matches || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Exatos</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{userRank?.correct_results || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Corretos</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estatísticas</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-2xl font-black text-white">{userRank?.ties || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Empates</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white">{userRank?.errors || 0}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Erros</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conquistas</span>
            <Trophy className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-3xl font-black text-white">0 <span className="text-sm text-slate-500 font-medium">ativas</span></div>
          <div className="flex -space-x-2 mt-2 opacity-50">
             <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center font-bold text-[10px]">👑</div>
             <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center font-bold text-[10px]">🎯</div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="space-y-6">
          {nextMatch ? (
             <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
               <div className="relative z-10">
                 <div className="flex justify-between items-center mb-6">
                   <span className="px-4 py-1.5 bg-white/20 backdrop-blur text-[10px] font-black rounded-full uppercase tracking-widest text-[#cbd5e1] border border-white/5">Próximo Jogo</span>
                   <span className="text-indigo-200 text-xs md:text-sm font-bold">
                     {new Date(nextMatch.match_date).toLocaleDateString("pt-BR", {day: "2-digit", month: "short"})} • {nextMatch.stage || nextMatch.group_name}
                   </span>
                 </div>
                 <div className="flex items-center justify-around">
                   <div className="text-center">
                     <TeamFlag flag={nextMatch.team_a_flag} size="lg" />
                     <h3 className="text-xl md:text-2xl font-black uppercase text-white">{nextMatch.team_a_code || "TBD"}</h3>
                   </div>
                   <div className="flex flex-col items-center gap-2">
                     <div className="text-white/40 font-black text-3xl md:text-4xl italic">VS</div>
                     <div className="bg-white/10 px-3 py-1 rounded text-[10px] md:text-xs font-bold border border-white/10 text-white truncate max-w-[120px]">{nextMatch.stadium}</div>
                   </div>
                   <div className="text-center">
                     <TeamFlag flag={nextMatch.team_b_flag} size="lg" />
                     <h3 className="text-xl md:text-2xl font-black uppercase text-white">{nextMatch.team_b_code || "TBD"}</h3>
                   </div>
                 </div>
                 <div className="mt-8 flex justify-center w-full">
                    <div className="flex items-center justify-center gap-2 md:gap-4 bg-slate-950/40 p-3 md:p-4 rounded-2xl border border-white/10 backdrop-blur w-full max-w-sm">
                       <input type="text" placeholder="-" maxLength={2} className="w-12 h-12 md:w-14 md:h-14 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-center text-xl md:text-3xl font-black outline-none focus-visible:border-yellow-500 text-white shrink-0 transition-colors" />
                       <span className="text-lg md:text-2xl font-black text-white/50 shrink-0">X</span>
                       <input type="text" placeholder="-" maxLength={2} className="w-12 h-12 md:w-14 md:h-14 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-center text-xl md:text-3xl font-black outline-none focus-visible:border-yellow-500 text-white shrink-0 transition-colors" />
                       <button className="ml-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-4 md:px-8 py-3 rounded-xl font-black uppercase tracking-tight transition-all text-xs md:text-sm flex-1">Salvar</button>
                    </div>
                 </div>
               </div>
               <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
             </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-3xl text-center flex flex-col items-center justify-center h-full min-h-[300px]">
               <span className="text-4xl mb-4">📅</span>
               <h3 className="text-lg font-bold text-white mb-2">Nenhum jogo agendado.</h3>
               <p className="text-slate-400">Aguardando atualização de partidas.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex flex-col bg-[#1E293B] rounded-3xl border border-slate-700/50 overflow-hidden h-full">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tight text-white">Ranking Geral</h3>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {rankings.slice(0, 5).map((r, i) => (
                  <div key={r.user_id} className={`p-4 flex items-center ${i === 0 ? 'bg-yellow-500/5 border-l-4 border-yellow-500' : 'border-b border-slate-800 opacity-90'} gap-4`}>
                     <span className={`w-6 text-center font-black ${i === 0 ? 'text-yellow-500' : 'text-slate-400'}`}>{i + 1}º</span>
                     <div className={`w-10 h-10 rounded-full bg-slate-700 ${i === 0 ? 'border-2 border-yellow-500' : ''} flex items-center justify-center font-bold text-white text-xs`}>
                       {r.user_id.slice(0, 2).toUpperCase()}
                     </div>
                     <div className="flex-1">
                        <p className="font-bold text-sm text-white">{r.user_id.substring(0, 8)}</p>
                     </div>
                     <span className="font-black text-white">{r.total_points}</span>
                  </div>
                ))}
                {rankings.length === 0 && (
                   <div className="p-8 text-center text-slate-500 font-medium">Nenhum jogador pontuou ainda.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamFlag({ flag, size = 'sm' }: { flag: string | null; size?: 'sm' | 'lg' }) {
  if (!flag) return <span className={size === 'lg' ? "text-5xl md:text-6xl drop-shadow-xl flex items-center justify-center mb-2 md:mb-4" : "text-xl"}>🏳️</span>;
  if (flag.startsWith('http')) {
     return <img src={flag} alt="flag" className={`object-contain ${size === 'lg' ? "w-16 h-16 md:w-24 md:h-24 mb-2 md:mb-4 drop-shadow-xl mx-auto" : "w-6 h-6 rounded-sm inline-block"}`} />;
  }
  return <span className={size === 'lg' ? "w-16 h-16 md:w-24 md:h-24 mb-2 md:mb-4 drop-shadow-xl flex items-center justify-center text-4xl md:text-5xl mx-auto" : "text-xl inline-block"}>{flag}</span>;
}
