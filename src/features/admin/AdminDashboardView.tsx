import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { BarChart, Activity, RefreshCw, AlertTriangle, CheckCircle2, Clock, Zap } from "lucide-react";

export function AdminDashboardView() {
  const [stats, setStats] = useState<any[]>([]);
  const [sysStatus, setSysStatus] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [todayUsage, setTodayUsage] = useState(0);

  const MAX_USAGE = 100;
  const WARNING_LIMIT = 80;
  const CRITICAL_LIMIT = 90;

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60000); // 1m refresh admin UI
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/usage");
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
        if (json.status) {
          setSysStatus(json.status);
          setTodayUsage(json.status.totalRequestsToday);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleManualSync = async () => {
    if (todayUsage >= MAX_USAGE) {
      alert("Limite diário atingido!");
      return;
    }
    
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/football", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        alert(`Sincronizado os jogos de hoje! ${json.data.count} obtidos.`);
      } else {
        alert(`Erro: ${json.error}`);
      }
      fetchUsage();
    } catch (e) {
      console.error(e);
    }
    setSyncing(false);
  };

  const remaining = MAX_USAGE - todayUsage;
  const isCritical = todayUsage >= CRITICAL_LIMIT;
  const isWarning = todayUsage >= WARNING_LIMIT && !isCritical;
  const isMaxed = todayUsage >= MAX_USAGE;

  const nextSyncDate = sysStatus.nextSync ? new Date(sysStatus.nextSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';
  const lastSyncDate = sysStatus.lastSync ? new Date(sysStatus.lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Painel Administrativo</h1>
          <p className="text-slate-400">Controle do motor de sincronização API-Football.</p>
        </div>
        
        <button 
          onClick={handleManualSync}
          disabled={syncing || isMaxed}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors self-start md:self-auto shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Forçar Sincronização
        </button>
      </div>

      {isCritical && !isMaxed && (
         <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-bold text-sm">Alerta Vermelho: Limite diário da API quase atingido ({todayUsage}/100 reqs).</span>
        </div>
      )}
      
      {isWarning && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-bold text-sm">Alerta Amarelo: Consumo moderado-alto detectado ({todayUsage}/100 reqs).</span>
        </div>
      )}

      {isMaxed && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-500 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-bold text-sm">Bloqueio: Limite diário de 100 requisições atingido. Novas consultas suspensas até amanhã.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-slate-800/40 border-slate-700/50 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Requisições Hoje</span>
              <Activity className={`${isCritical ? 'text-red-400' : 'text-blue-400'} w-4 h-4`} />
            </div>
            <div className="text-4xl font-black text-white mb-1">{todayUsage}</div>
            <div className="text-sm font-medium text-slate-500"><span className="text-blue-400 font-bold">{remaining}</span> restantes de {MAX_USAGE}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/40 border-slate-700/50 rounded-3xl relative overflow-hidden">
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status de Sincronia</span>
              {sysStatus.intervalMinutes === 10 ? <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" /> : <Clock className="w-4 h-4 text-indigo-400" />}
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-black text-white mb-1">{sysStatus.intervalMinutes}<span className="text-sm text-slate-500 font-medium">m</span></div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Intervalo Atual</div>
              </div>
              <div className="border-l border-slate-700 pl-4">
                <div className="text-2xl font-black text-white mb-1">{sysStatus.liveMatches}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Jogos AO VIVO</div>
              </div>
            </div>
          </CardContent>
          {sysStatus.intervalMinutes === 10 && (
             <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-2xl rounded-full translate-x-10 -translate-y-10 z-0"></div>
          )}
        </Card>

        <Card className="bg-slate-800/40 border-slate-700/50 rounded-3xl">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Linha do Tempo</div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500 font-medium">Última Ref:</span>
                <span className="text-white font-bold">{lastSyncDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Próxima Ref:</span>
                <span className="text-indigo-300 font-bold">{nextSyncDate}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/40 border-slate-700/50 rounded-3xl">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conta API</span>
              {isMaxed ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </div>
            <div className="text-2xl font-black text-white mb-2">{isMaxed ? "Bloqueado" : "Operacional"}</div>
            <div className="flex">
               <Badge variant="outline" className={`${isMaxed ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"} font-bold`}>Plano Free (100 Req)</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-800">
          <h3 className="font-bold text-white text-lg">Histórico de Uso por Endpoint (Hoje)</h3>
        </div>
        <div className="divide-y divide-slate-800/50">
          {loading ? (
            <div className="p-6 text-center text-slate-500 font-medium">Carregando logs...</div>
          ) : stats.length === 0 ? (
            <div className="p-6 text-center text-slate-500 font-medium">Nenhuma sincronização registrada ainda.</div>
          ) : (
            stats.map((log: any) => (
              <div key={log.id} className="p-4 px-6 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{log.endpoint}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">{log.request_date}</div>
                </div>
                <Badge variant="outline" className="text-indigo-300 border-indigo-500/30 bg-indigo-500/10 font-bold">{log.requests_count} Req</Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
