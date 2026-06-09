import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Activity, CheckCircle2, Clock, Download, Eye, RefreshCw, Search, ShieldCheck, Users, Zap } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Progress } from "@/src/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { downloadAdminPredictionsWorkbook } from "@/src/lib/admin-report-export";
import { useSupabase } from "@/src/lib/supabase-provider";
import type { AdminMatchCoverage, AdminParticipantSummary, AdminPredictionRecord, AdminPredictionsReport } from "@/src/types/admin";

type UsageLog = {
  id: string;
  endpoint: string;
  request_date: string;
  requests_count: number;
};

type AdminSystemStatus = {
  intervalMinutes?: number;
  liveMatches?: number;
  totalRequestsToday?: number;
  nextSync?: string | null;
  lastSync?: string | null;
};

const MAX_USAGE = 100;
const WARNING_LIMIT = 80;
const CRITICAL_LIMIT = 90;

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMatchLabel(record: {
  teamAName?: string | null;
  teamACode?: string | null;
  teamBName?: string | null;
  teamBCode?: string | null;
}) {
  const teamA = record.teamAName || record.teamACode || "Time A";
  const teamB = record.teamBName || record.teamBCode || "Time B";
  return `${teamA} x ${teamB}`;
}

function getPredictionStatusLabel(prediction: AdminPredictionRecord) {
  if (prediction.predictedScoreA === null || prediction.predictedScoreB === null) {
    return "Sem palpite";
  }

  if (prediction.pointsEarned > 0) {
    return "Pontuado";
  }

  if (["FT", "AET", "PEN", "FINISHED"].includes(prediction.matchStatus || "")) {
    return "Encerrado";
  }

  return "Registrado";
}

export function AdminDashboardView() {
  const { session } = useSupabase();
  const [stats, setStats] = useState<UsageLog[]>([]);
  const [sysStatus, setSysStatus] = useState<AdminSystemStatus>({});
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<AdminPredictionsReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("all");
  const [selectedParticipant, setSelectedParticipant] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const todayUsage = sysStatus.totalRequestsToday || 0;
  const remaining = Math.max(MAX_USAGE - todayUsage, 0);
  const isCritical = todayUsage >= CRITICAL_LIMIT;
  const isWarning = todayUsage >= WARNING_LIMIT && !isCritical;
  const isMaxed = todayUsage >= MAX_USAGE;

  const nextSyncDate = sysStatus.nextSync
    ? new Date(sysStatus.nextSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "...";
  const lastSyncDate = sysStatus.lastSync
    ? new Date(sysStatus.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "...";

  useEffect(() => {
    void fetchUsage();
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    void fetchAdminReport(session.access_token);
    const interval = setInterval(() => {
      void fetchAdminReport(session.access_token);
    }, 60000);

    return () => clearInterval(interval);
  }, [session?.access_token]);

  const fetchUsage = async () => {
    setLoadingUsage(true);
    try {
      const res = await fetch("/api/admin/usage");
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
        if (json.status) {
          setSysStatus(json.status);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUsage(false);
    }
  };

  const fetchAdminReport = async (token: string) => {
    setLoadingReport(true);
    setReportError(null);
    try {
      const res = await fetch("/api/admin/predictions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Nao foi possivel carregar o centro de palpites.");
      }
      setReport(json.data);
    } catch (error: any) {
      console.error(error);
      setReportError(error.message || "Erro ao carregar o painel de palpites.");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleManualSync = async () => {
    if (todayUsage >= MAX_USAGE) {
      alert("Limite diario atingido.");
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch("/api/sync/football", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        alert(`Sincronizacao concluida com ${json.data.count} jogo(s).`);
      } else {
        alert(`Erro: ${json.error}`);
      }
      void fetchUsage();
      if (session?.access_token) {
        void fetchAdminReport(session.access_token);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const participants = report?.participants || [];
  const predictions = report?.predictions || [];
  const coverage = report?.coverage || [];

  const phaseOptions = useMemo(() => {
    return Array.from(
      new Set(
        predictions
          .map((prediction) => prediction.stage || prediction.groupName || "")
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [predictions]);

  const participantOptions = useMemo(() => {
    return participants.map((participant) => ({
      value: participant.userId,
      label: participant.displayName,
    }));
  }, [participants]);

  const filteredPredictions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return predictions.filter((prediction) => {
      const phase = prediction.stage || prediction.groupName || "";
      const derivedStatus = getPredictionStatusLabel(prediction);
      const matchesSearch =
        !term ||
        prediction.displayName.toLowerCase().includes(term) ||
        prediction.email.toLowerCase().includes(term) ||
        formatMatchLabel(prediction).toLowerCase().includes(term) ||
        [prediction.stadium, prediction.city, prediction.groupName, prediction.stage]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesPhase = selectedPhase === "all" || phase === selectedPhase;
      const matchesParticipant =
        selectedParticipant === "all" || prediction.userId === selectedParticipant;
      const matchesStatus = selectedStatus === "all" || derivedStatus === selectedStatus;

      return matchesSearch && matchesPhase && matchesParticipant && matchesStatus;
    });
  }, [predictions, search, selectedPhase, selectedParticipant, selectedStatus]);

  const filteredParticipantIds = useMemo(
    () => new Set(filteredPredictions.map((prediction) => prediction.userId)),
    [filteredPredictions],
  );

  const filteredParticipants = useMemo(() => {
    if (selectedParticipant !== "all") {
      return participants.filter((participant) => participant.userId === selectedParticipant);
    }
    if (!search.trim() && selectedPhase === "all" && selectedStatus === "all") {
      return participants;
    }
    return participants.filter((participant) => filteredParticipantIds.has(participant.userId));
  }, [participants, selectedParticipant, search, selectedPhase, selectedStatus, filteredParticipantIds]);

  const filteredCoverage = useMemo(() => {
    const visibleMatchIds = new Set(filteredPredictions.map((prediction) => prediction.matchId));
    if (!search.trim() && selectedPhase === "all" && selectedParticipant === "all" && selectedStatus === "all") {
      return coverage;
    }
    return coverage.filter((item) => visibleMatchIds.has(item.matchId));
  }, [coverage, filteredPredictions, search, selectedPhase, selectedParticipant, selectedStatus]);

  const recentPredictions = filteredPredictions.slice(0, 8);
  const coverageHotspots = [...filteredCoverage].sort((a, b) => a.coverageRate - b.coverageRate).slice(0, 6);

  const filteredSummary = useMemo(() => {
    const averageCoverage =
      filteredParticipants.length > 0
        ? Math.round(
            filteredParticipants.reduce((sum, participant) => sum + participant.completionRate, 0) /
              filteredParticipants.length,
          )
        : 0;

    return {
      participants: filteredParticipants.length,
      predictions: filteredPredictions.length,
      averageCoverage,
      matchesWithoutCoverage: filteredCoverage.filter((match) => match.predictionCount === 0).length,
    };
  }, [filteredParticipants, filteredPredictions, filteredCoverage]);

  const handleExport = () => {
    if (!report) {
      return;
    }

    downloadAdminPredictionsWorkbook({
      report,
      filteredPredictions,
      filteredParticipants,
      filteredCoverage,
      label:
        selectedParticipant !== "all"
          ? "Recorte por participante"
          : selectedPhase !== "all"
            ? `Recorte por fase: ${selectedPhase}`
            : "Visao filtrada do painel",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.18),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))] p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/30 to-transparent" />
        <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.28em] text-sky-300">
              <ShieldCheck className="h-4 w-4" />
              Central Administrativa
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                Painel administrativo com leitura rapida, exportacao e controle vivo da rodada
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Controle sincronizacao, acompanhe a adesao do bolao e detecte lacunas antes da rodada travar.
                Tudo organizado para uma leitura mais executiva e agradavel.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Requisicoes hoje</div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-black text-white">{todayUsage}</span>
                  <span className="pb-1 text-sm font-semibold text-slate-400">de {MAX_USAGE}</span>
                </div>
                <div className="mt-2 text-sm text-sky-300">{remaining} ainda disponiveis</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Proxima janela</div>
                <div className="mt-2 text-3xl font-black text-white">{nextSyncDate}</div>
                <div className="mt-2 text-sm text-slate-400">
                  Ultima leitura: <span className="font-semibold text-white">{lastSyncDate}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Status atual</div>
                <div className="mt-2 flex items-center gap-2 text-3xl font-black text-white">
                  {sysStatus.liveMatches || 0}
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">ao vivo</span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Intervalo: <span className="font-semibold text-white">{sysStatus.intervalMinutes || 0} min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Acoes rapidas</div>
                <div className="mt-2 text-lg font-black text-white">Operacao do painel</div>
              </div>
              <Badge
                variant="outline"
                className={`${
                  isMaxed
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {isMaxed ? "Limite atingido" : "Base operacional"}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  void fetchUsage();
                  if (session?.access_token) {
                    void fetchAdminReport(session.access_token);
                  }
                }}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${(loadingUsage || loadingReport) ? "animate-spin" : ""}`} />
                Atualizar painel
              </button>
              <button
                onClick={handleExport}
                disabled={!report || filteredPredictions.length === 0}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-slate-950 transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </button>
              <button
                onClick={handleManualSync}
                disabled={syncing || isMaxed}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 sm:col-span-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                Forcar sincronizacao
              </button>
            </div>
          </div>
        </div>
      </section>

      {isCritical && !isMaxed && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/15 p-4 text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-bold">
            Alerta vermelho: limite diario da API quase atingido ({todayUsage}/100).
          </span>
        </div>
      )}

      {isWarning && (
        <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/50 bg-yellow-500/15 p-4 text-yellow-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-bold">
            Alerta amarelo: consumo elevado detectado ({todayUsage}/100).
          </span>
        </div>
      )}

      {isMaxed && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/15 p-4 text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm font-bold">
            Bloqueio: limite diario de 100 requisicoes atingido. Novas consultas aguardam o proximo ciclo.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border-slate-700/50 bg-slate-800/40">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Requisicoes Hoje</span>
              <Activity className={`h-4 w-4 ${isCritical ? "text-red-400" : "text-blue-400"}`} />
            </div>
            <div className="mb-1 text-4xl font-black text-white">{todayUsage}</div>
            <div className="text-sm font-medium text-slate-500">
              <span className="font-bold text-blue-400">{remaining}</span> restantes de {MAX_USAGE}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-3xl border-slate-700/50 bg-slate-800/40">
          <CardContent className="relative z-10 p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Status de Sincronia</span>
              {sysStatus.intervalMinutes === 10 ? (
                <Zap className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              ) : (
                <Clock className="h-4 w-4 text-indigo-400" />
              )}
            </div>
            <div className="flex gap-4">
              <div>
                <div className="mb-1 text-2xl font-black text-white">
                  {sysStatus.intervalMinutes}
                  <span className="text-sm font-medium text-slate-500">m</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Intervalo Atual</div>
              </div>
              <div className="border-l border-slate-700 pl-4">
                <div className="mb-1 text-2xl font-black text-white">{sysStatus.liveMatches || 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jogos AO VIVO</div>
              </div>
            </div>
          </CardContent>
          {sysStatus.intervalMinutes === 10 && (
            <div className="absolute right-0 top-0 z-0 h-32 w-32 -translate-y-10 translate-x-10 rounded-full bg-yellow-500/10 blur-2xl" />
          )}
        </Card>

        <Card className="rounded-3xl border-slate-700/50 bg-slate-800/40">
          <CardContent className="flex h-full flex-col justify-between p-6">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Linha do Tempo</div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-500">Ultima ref:</span>
                <span className="font-bold text-white">{lastSyncDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-500">Proxima ref:</span>
                <span className="font-bold text-indigo-300">{nextSyncDate}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-700/50 bg-slate-800/40">
          <CardContent className="flex h-full flex-col justify-between p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Conta API</span>
              {isMaxed ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="mb-2 text-2xl font-black text-white">{isMaxed ? "Bloqueado" : "Operacional"}</div>
            <div className="flex">
              <Badge
                variant="outline"
                className={`font-bold ${
                  isMaxed
                    ? "border-red-500/20 bg-red-500/10 text-red-400"
                    : "border-green-500/20 bg-green-500/10 text-green-400"
                }`}
              >
                Plano Free (100 Req)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900">
        <CardContent className="p-0">
          <div className="border-b border-slate-800 bg-[linear-gradient(180deg,rgba(30,41,59,0.34),rgba(15,23,42,0.15))] p-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)] xl:items-center">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  Centro de Palpites
                </div>
                <h2 className="mt-3 max-w-2xl text-2xl font-black leading-tight text-white sm:text-[2rem]">
                  Acompanhe todos os cadastrados com leitura instantanea da rodada
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                  Uma mesa de controle mais clara para enxergar cobertura por jogo, comportamento
                  dos participantes e gargalos antes da rodada travar.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Participantes</div>
                  <div className="mt-3 text-4xl font-black text-white">{report?.summary.participants || 0}</div>
                  <div className="mt-2 text-xs text-slate-500">Cadastrados visiveis no painel</div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Palpites</div>
                  <div className="mt-3 text-4xl font-black text-white">{report?.summary.predictions || 0}</div>
                  <div className="mt-2 text-xs text-slate-500">Entradas registradas na base</div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Cobertura média</div>
                  <div className="mt-2 text-3xl font-black text-emerald-300">{report?.summary.averageCompletionRate || 0}%</div>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Jogos sem palpite</div>
                  <div className="mt-2 text-3xl font-black text-amber-300">{report?.summary.matchesWithoutPredictions || 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-800 px-6 py-5">
            <div className="grid gap-3 lg:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
              <label className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Busca ampla</div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nome, email, jogo, estadio..."
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </label>

              <label className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Fase</div>
                <select
                  value={selectedPhase}
                  onChange={(event) => setSelectedPhase(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                >
                  <option value="all">Todas</option>
                  {phaseOptions.map((phase) => (
                    <option key={phase} value={phase} className="bg-slate-900">
                      {phase}
                    </option>
                  ))}
                </select>
              </label>

              <label className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Participante</div>
                <select
                  value={selectedParticipant}
                  onChange={(event) => setSelectedParticipant(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                >
                  <option value="all">Todos</option>
                  {participantOptions.map((participant) => (
                    <option key={participant.value} value={participant.value} className="bg-slate-900">
                      {participant.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Situação</div>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                >
                  <option value="all">Todas</option>
                  <option value="Registrado" className="bg-slate-900">Registrado</option>
                  <option value="Pontuado" className="bg-slate-900">Pontuado</option>
                  <option value="Encerrado" className="bg-slate-900">Encerrado</option>
                  <option value="Sem palpite" className="bg-slate-900">Sem palpite</option>
                </select>
              </label>
            </div>
          </div>

          {reportError ? (
            <div className="p-6 text-sm font-medium text-red-300">{reportError}</div>
          ) : loadingReport ? (
            <div className="p-6 text-sm font-medium text-slate-400">Montando central de palpites...</div>
          ) : (
            <div className="p-6">
              <Tabs defaultValue="operacao" className="w-full">
                <TabsList className="h-auto rounded-2xl bg-slate-950/70 p-1 text-slate-400">
                  <TabsTrigger value="operacao" className="rounded-xl data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                    Sala de controle
                  </TabsTrigger>
                  <TabsTrigger value="palpites" className="rounded-xl data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                    Todos os palpites
                  </TabsTrigger>
                  <TabsTrigger value="participantes" className="rounded-xl data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                    Participantes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="operacao" className="space-y-5">
                  <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Radar de cobertura</div>
                          <h3 className="mt-1 text-xl font-black text-white">Jogos com maior risco de lacuna</h3>
                        </div>
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-300">
                          {filteredSummary.matchesWithoutCoverage} sem cobertura
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {coverageHotspots.length > 0 ? (
                          coverageHotspots.map((item) => (
                            <div key={item.matchId} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <div className="text-sm font-black uppercase text-white">{formatMatchLabel(item)}</div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {item.stage || item.groupName || "Agenda oficial"} • {formatDateTime(item.matchDate)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-white">{item.predictionCount} palpites</div>
                                  <div className="text-xs text-slate-500">{item.missingParticipants} sem enviar</div>
                                </div>
                              </div>
                              <Progress value={item.coverageRate} className="mt-4 h-2 bg-slate-800" />
                              <div className="mt-2 flex justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                                <span>Cobertura</span>
                                <span>{item.coverageRate}%</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
                            Nenhum jogo corresponde aos filtros atuais.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Pulso da equipe</div>
                          <h3 className="mt-1 text-xl font-black text-white">Quem está mais adiantado</h3>
                        </div>
                        <Users className="h-5 w-5 text-emerald-300" />
                      </div>
                      <div className="space-y-3">
                        {filteredParticipants.slice(0, 6).map((participant, index) => (
                          <div key={participant.userId} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-black text-white">
                                  {index + 1}. {participant.displayName}
                                </div>
                                <div className="text-xs text-slate-500">{participant.email}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-black text-emerald-300">{participant.totalPoints} pts</div>
                                <div className="text-xs text-slate-500">{participant.totalPredictions} palpites</div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Progress value={participant.completionRate} className="h-2 bg-slate-800" />
                              <div className="mt-2 flex justify-between text-xs text-slate-500">
                                <span>Cobertura da agenda</span>
                                <span>{participant.completionRate}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Ultimos movimentos</div>
                        <h3 className="mt-1 text-xl font-black text-white">Linha viva dos palpites</h3>
                      </div>
                      <Eye className="h-5 w-5 text-indigo-300" />
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {recentPredictions.length > 0 ? (
                        recentPredictions.map((prediction) => (
                          <div key={prediction.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-black text-white">{prediction.displayName}</div>
                                <div className="text-xs text-slate-500">{formatMatchLabel(prediction)}</div>
                              </div>
                              <Badge
                                variant="outline"
                                className={`${
                                  prediction.pointsEarned > 0
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                    : "border-slate-700 bg-slate-800 text-slate-300"
                                }`}
                              >
                                {getPredictionStatusLabel(prediction)}
                              </Badge>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm">
                              <div className="font-bold text-white">
                                {prediction.predictedScoreA === null || prediction.predictedScoreB === null
                                  ? "Sem placar"
                                  : `${prediction.predictedScoreA} x ${prediction.predictedScoreB}`}
                              </div>
                              <div className="text-xs text-slate-500">
                                Atualizado em {formatDateTime(prediction.updatedAt || prediction.createdAt)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400 lg:col-span-2">
                          Ainda nao ha movimentos dentro do recorte atual.
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="palpites">
                  <div className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950/70">
                    <div className="grid grid-cols-[1.1fr_0.8fr_0.55fr_0.55fr_0.7fr_0.7fr] gap-4 border-b border-slate-800 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      <div>Participante</div>
                      <div>Jogo</div>
                      <div>Palpite</div>
                      <div>Oficial</div>
                      <div>Status</div>
                      <div>Atualizado</div>
                    </div>
                    <div className="max-h-[36rem] overflow-auto">
                      {filteredPredictions.length > 0 ? (
                        filteredPredictions.map((prediction) => (
                          <div
                            key={prediction.id}
                            className="grid grid-cols-[1.1fr_0.8fr_0.55fr_0.55fr_0.7fr_0.7fr] gap-4 border-b border-slate-800/70 px-5 py-4 text-sm last:border-b-0"
                          >
                            <div>
                              <div className="font-black text-white">{prediction.displayName}</div>
                              <div className="text-xs text-slate-500">{prediction.email}</div>
                            </div>
                            <div>
                              <div className="font-bold text-white">{formatMatchLabel(prediction)}</div>
                              <div className="text-xs text-slate-500">
                                {prediction.stage || prediction.groupName || "Agenda oficial"} • {formatDateTime(prediction.matchDate)}
                              </div>
                            </div>
                            <div className="font-black text-white">
                              {prediction.predictedScoreA === null || prediction.predictedScoreB === null
                                ? "—"
                                : `${prediction.predictedScoreA} x ${prediction.predictedScoreB}`}
                            </div>
                            <div className="font-bold text-slate-300">
                              {prediction.officialScoreA === null || prediction.officialScoreB === null
                                ? "—"
                                : `${prediction.officialScoreA} x ${prediction.officialScoreB}`}
                            </div>
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className={`${
                                  prediction.pointsEarned > 0
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                    : "border-slate-700 bg-slate-800 text-slate-300"
                                }`}
                              >
                                {getPredictionStatusLabel(prediction)}
                              </Badge>
                              <div className="text-xs text-slate-500">
                                {prediction.pointsEarned} pts • x{prediction.multiplierApplied}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDateTime(prediction.updatedAt || prediction.createdAt)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-sm text-slate-400">Nenhum palpite encontrado com os filtros atuais.</div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="participantes">
                  <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                    {filteredParticipants.length > 0 ? (
                      filteredParticipants.map((participant) => (
                        <div key={participant.userId} className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-lg font-black text-white">{participant.displayName}</div>
                              <div className="text-sm text-slate-500">{participant.email}</div>
                            </div>
                            <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                              {participant.totalPoints} pts
                            </Badge>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Cobertura</div>
                              <div className="mt-2 text-2xl font-black text-emerald-300">{participant.completionRate}%</div>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Palpites</div>
                              <div className="mt-2 text-2xl font-black text-white">{participant.totalPredictions}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Exatos</div>
                              <div className="mt-2 text-2xl font-black text-amber-300">{participant.exactMatches}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Corretos</div>
                              <div className="mt-2 text-2xl font-black text-indigo-300">{participant.correctResults}</div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <Progress value={participant.completionRate} className="h-2 bg-slate-800" />
                            <div className="mt-2 flex justify-between text-xs text-slate-500">
                              <span>Último envio</span>
                              <span>{formatDateTime(participant.lastPredictionAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5 text-sm text-slate-400 lg:col-span-2 2xl:col-span-3">
                        Nenhum participante corresponde aos filtros atuais.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-6">
          <h3 className="text-lg font-bold text-white">Historico de uso por endpoint (hoje)</h3>
        </div>
        <div className="divide-y divide-slate-800/50">
          {loadingUsage ? (
            <div className="p-6 text-center font-medium text-slate-500">Carregando logs...</div>
          ) : stats.length === 0 ? (
            <div className="p-6 text-center font-medium text-slate-500">Nenhuma sincronizacao registrada ainda.</div>
          ) : (
            stats.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="text-sm font-bold text-white">{log.endpoint}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500">{log.request_date}</div>
                </div>
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 font-bold text-indigo-300">
                  {log.requests_count} Req
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
