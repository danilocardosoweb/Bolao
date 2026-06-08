import { Card, CardContent } from "@/src/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { useSupabase } from "@/src/lib/supabase-provider";
import { TrendingUp, TrendingDown, Minus, Crown } from "lucide-react";

export function RankingView() {
  const { rankings, loading, user } = useSupabase();
  const currentUser = rankings.find((ranking) => ranking.user_id === user?.id) ?? null;

  if (loading) {
     return <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Rankings Oficiais</h1>
        </div>
      </div>

      <Card className="border-none bg-[#1E293B] rounded-3xl border border-slate-700/50 overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-800 border-b border-slate-700 text-slate-400 font-bold">
              <tr>
                <th scope="col" className="px-3 md:px-4 py-4 w-12 md:w-16 text-center">Pos</th>
                <th scope="col" className="px-3 md:px-4 py-4 whitespace-nowrap">Participante</th>
                <th scope="col" className="px-3 md:px-4 py-4 text-center w-20 md:w-24">Exatos</th>
                <th scope="col" className="px-3 md:px-4 py-4 text-center w-20 md:w-24">Corretos</th>
                <th scope="col" className="px-3 md:px-4 py-4 text-right pr-4 md:pr-6 w-24 md:w-32">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rankings.map((rank, index) => {
                const position = index + 1;
                const isCurrentUser = currentUser && rank.user_id === currentUser.user_id;
                // Currently no position history.
                const positionChange = 0; 
                
                return (
                  <tr key={rank.user_id} className={`transition-colors ${isCurrentUser ? 'bg-indigo-600/10 border-indigo-500/20 shadow-[inset_0_0_10px_rgba(79,70,229,0.1)]' : 'bg-transparent hover:bg-slate-800/50'}`}>
                    <td className="px-3 md:px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1 md:space-x-2">
                        <span className={`text-sm md:text-base font-black w-5 md:w-6 text-center ${position === 1 ? 'text-yellow-500' : position === 2 ? 'text-slate-400' : position === 3 ? 'text-orange-500' : 'text-slate-500'}`}>
                          {position}º
                        </span>
                        {positionChange > 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : positionChange < 0 ? (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        ) : (
                          <Minus className="w-3 h-3 text-slate-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-4">
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <div className="relative shrink-0">
                          {isCurrentUser ? (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-slate-900 border-2 border-[#1E293B] text-[8px]">
                              VOCÊ
                            </div>
                          ) : (
                            <Avatar className="h-10 w-10 border-2 border-[#1E293B]">
                              <AvatarFallback className="bg-slate-700 font-bold text-white uppercase text-xs">{(rank.user_id || '').substring(0, 2)}</AvatarFallback>
                            </Avatar>
                          )}
                          {position === 1 && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-0.5 shadow-sm">
                              <Crown className="w-3 h-3 text-slate-900" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${isCurrentUser ? 'text-indigo-200' : 'text-white'}`}>{(rank.user_id || '').substring(0,8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center font-bold text-slate-400">
                      {rank.exact_matches || 0}
                    </td>
                    <td className="px-3 md:px-4 py-4 text-center font-bold text-slate-400">
                      {rank.correct_results || 0}
                    </td>
                    <td className="px-3 md:px-4 py-4 text-right pr-4 md:pr-6">
                      <span className="text-lg font-black text-white">{rank.total_points || 0}</span>
                    </td>
                  </tr>
                );
              })}
              {rankings.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-8 text-center text-slate-500">Nenhum ranking disponível (aguardando finalizações).</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Rules Summary */}
      <h2 className="text-xl font-bold tracking-tight text-white mb-4 mt-12">Regras de Pontuação</h2>
      
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700 flex flex-col">
          <Badge className="mb-3 bg-yellow-500 text-slate-900 font-black self-start">+10 pontos</Badge>
          <span className="text-sm font-bold text-white mb-1">Placar Exato</span>
          <span className="text-xs text-slate-400">Você cravou o resultado real.</span>
        </div>
        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700 flex flex-col">
          <Badge className="mb-3 bg-indigo-500 text-white font-black self-start">+7 pontos</Badge>
          <span className="text-sm font-bold text-white mb-1">Vencedor e Saldo</span>
          <span className="text-xs text-slate-400">Acertou time vencedor e a diferença exata de gols.</span>
        </div>
        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700 flex flex-col">
          <Badge className="mb-3 bg-blue-500 text-white font-black self-start">+5 pontos</Badge>
          <span className="text-sm font-bold text-white mb-1">Vencedor ou Empate</span>
          <span className="text-xs text-slate-400">Acertou apenas quem venceu, ou se seria empate.</span>
        </div>
        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700 flex flex-col">
          <Badge className="mb-3 bg-slate-600 text-white font-black self-start">+2 pontos</Badge>
          <span className="text-sm font-bold text-white mb-1">Gols de 1 Time</span>
          <span className="text-xs text-slate-400">Falhou no resultado, mas acertou os gols de um dos lados.</span>
        </div>
        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700 flex flex-col">
          <Badge className="mb-3 bg-red-500 text-white font-black self-start">0 pontos</Badge>
          <span className="text-sm font-bold text-white mb-1">Errou Tudo</span>
          <span className="text-xs text-slate-400">Nenhum acerto relacionado à partida.</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-4">Multiplicadores por Fase</h2>
          <div className="bg-[#1E293B] rounded-3xl border border-slate-700/50 overflow-hidden">
            <div className="divide-y divide-slate-800">
              <div className="flex justify-between items-center p-4">
                <span className="text-sm font-bold text-slate-300">Fase de Grupos</span>
                <Badge variant="outline" className="text-white border-slate-600 bg-slate-800/50 font-black">1.0x</Badge>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-sm font-bold text-slate-300">32 avos / Oitavas</span>
                <Badge variant="outline" className="text-white border-slate-600 bg-slate-800/50 font-black">1.2x - 1.5x</Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-indigo-500/10">
                <span className="text-sm font-bold text-indigo-300">Quartas / Semifinais</span>
                <Badge variant="outline" className="text-indigo-300 border-indigo-500/30 bg-indigo-500/20 font-black">2.0x - 2.5x</Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-yellow-500/10">
                <span className="text-sm font-bold text-yellow-500">Final</span>
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/20 font-black">3.0x</Badge>
              </div>
            </div>
          </div>
        </div>

        <div>
           {/* Space reserved for accomplishments */}
        </div>
      </div>
    </div>
  );
}
