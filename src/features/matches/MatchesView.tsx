import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { AlertCircle, ChevronRight, Lock, PencilLine, ShieldCheck } from "lucide-react";
import { useSupabase } from "@/src/lib/supabase-provider";
import { canSubmitPredictions, getPredictionDeadline } from "@/src/lib/predictionWindow";

const OPEN_MATCH_STATUSES = ["NS", "TBD", "SCHEDULED", "TIMED"];
const FINISHED_MATCH_STATUSES = ["FT", "AET", "PEN", "FINISHED"];
const LIVE_MATCH_STATUSES = ["LIVE", "1H", "HT", "2H", "ET", "BT", "P"];

type PhaseFilter = "all" | "groups" | "knockout" | "finished";

const STAGE_ORDER = [
  "group_stage",
  "round_of_32",
  "round_of_16",
  "quarter_finals",
  "semi_finals",
  "third_place",
  "final",
];

const STAGE_LABELS: Record<string, string> = {
  group_stage: "Fase de Grupos",
  round_of_32: "Mata-mata - 32 avos",
  round_of_16: "Oitavas de final",
  quarter_finals: "Quartas de final",
  semi_finals: "Semifinais",
  third_place: "Disputa do 3o lugar",
  final: "Final",
};

const GROUP_ORDER = Array.from({ length: 12 }, (_, index) => `GROUP_${String.fromCharCode(65 + index)}`);

type DraftState = Record<string, { home: string; away: string }>;

export function MatchesView() {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("groups");
  const [selectedGroup, setSelectedGroup] = useState<string>("GROUP_A");
  const [drafts, setDrafts] = useState<DraftState>({});
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { matches, loading, error, predictions, savePrediction, user } = useSupabase();
  const predictionDeadline = useMemo(() => getPredictionDeadline(matches), [matches]);
  const predictionsOpen = useMemo(() => canSubmitPredictions(matches), [matches]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  }, [matches]);

  const matchesById = useMemo(() => new Map(sortedMatches.map((match) => [match.id, match])), [sortedMatches]);
  const predictionsByMatchId = useMemo(() => new Map(predictions.map((prediction) => [prediction.match_id, prediction])), [predictions]);

  const groupMatches = useMemo(
    () => sortedMatches.filter((match) => match.stage === "group_stage"),
    [sortedMatches],
  );

  const knockoutMatches = useMemo(
    () => sortedMatches.filter((match) => match.stage && match.stage !== "group_stage"),
    [sortedMatches],
  );

  const groupNames = useMemo(() => {
    const names = new Set(groupMatches.map((match) => match.group_name).filter(Boolean));
    return GROUP_ORDER.filter((groupName) => names.has(groupName));
  }, [groupMatches]);

  const sections = useMemo(() => {
    if (phaseFilter === "groups") {
      const selected = groupMatches.filter((match) => match.group_name === selectedGroup);
      return selected.length ? [{ title: friendlyGroupName(selectedGroup), matches: selected }] : [];
    }

    if (phaseFilter === "knockout") {
      return STAGE_ORDER.filter((stage) => stage !== "group_stage")
        .map((stage) => ({
          title: STAGE_LABELS[stage] || stage,
          matches: knockoutMatches.filter((match) => match.stage === stage),
        }))
        .filter((section) => section.matches.length > 0);
    }

    if (phaseFilter === "finished") {
      return buildAutoSections(sortedMatches.filter((match) => FINISHED_MATCH_STATUSES.includes(match.status)));
    }

    return buildAutoSections(sortedMatches);
  }, [groupMatches, knockoutMatches, phaseFilter, selectedGroup, sortedMatches]);

  const myPredictions = useMemo(() => {
    return predictions
      .map((prediction) => {
        const match = matchesById.get(prediction.match_id);
        if (!match) return null;
        return { prediction, match };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(a.match.match_date).getTime() - new Date(b.match.match_date).getTime());
  }, [matchesById, predictions]);

  useEffect(() => {
    if (!user) {
      setDrafts({});
      return;
    }

    setDrafts((current) => {
      const next = { ...current };

      for (const match of sortedMatches) {
        if (!next[match.id]) {
          const prediction = predictionsByMatchId.get(match.id);
          next[match.id] = {
            home: prediction?.predicted_score_a?.toString() ?? "",
            away: prediction?.predicted_score_b?.toString() ?? "",
          };
        }
      }

      for (const matchId of Object.keys(next)) {
        if (!matchesById.has(matchId)) {
          delete next[matchId];
        }
      }

      return next;
    });
  }, [matchesById, predictionsByMatchId, sortedMatches, user]);

  const handleSavePrediction = async (match: any) => {
    if (!predictionsOpen) return;

    const draft = drafts[match.id] || { home: "", away: "" };
    const homeScore = parseScore(draft.home);
    const awayScore = parseScore(draft.away);

    if (homeScore === null || awayScore === null) {
      setNotice({ type: "error", message: "Preencha os dois placares com números inteiros." });
      return;
    }

    setSavingMatchId(match.id);
    setNotice(null);

    const result = await savePrediction(match.id, homeScore, awayScore);
    setSavingMatchId(null);

    if (result.error) {
      setNotice({ type: "error", message: result.error });
      return;
    }

    setDrafts((current) => ({
      ...current,
      [match.id]: {
        home: homeScore.toString(),
        away: awayScore.toString(),
      },
    }));
    setNotice({ type: "success", message: "Palpite salvo com sucesso." });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">Próximos Jogos</h1>
          <p className="text-slate-400 text-sm">
            Separado por grupos na primeira fase e por mata-mata nas etapas seguintes.
          </p>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto min-w-0">
          <button
            onClick={() => setPhaseFilter("all")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              phaseFilter === "all" ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setPhaseFilter("groups")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              phaseFilter === "groups" ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Grupos
          </button>
          <button
            onClick={() => setPhaseFilter("knockout")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              phaseFilter === "knockout" ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mata-mata
          </button>
          <button
            onClick={() => setPhaseFilter("finished")}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              phaseFilter === "finished" ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Encerrados
          </button>
        </div>
      </div>

      {phaseFilter === "groups" && groupNames.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groupNames.map((groupName) => (
            <button
              key={groupName}
              onClick={() => setSelectedGroup(groupName)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                selectedGroup === groupName
                  ? "bg-yellow-500 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {friendlyGroupName(groupName)}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>Erro ao carregar jogos: {error}</span>
        </div>
      )}

      {!loading && !error && sections.length === 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-3xl text-center flex flex-col items-center justify-center">
          <span className="text-4xl mb-4">📅</span>
          <h3 className="text-lg font-bold text-white mb-2">Nenhum jogo encontrado.</h3>
          <p className="text-slate-400">Sincronize os dados no painel administrativo.</p>
        </div>
      )}

      {!loading && !error && predictionDeadline && (
        <div className={`rounded-3xl border p-4 md:p-5 ${predictionsOpen ? "border-green-500/20 bg-green-500/10 text-green-100" : "border-amber-500/20 bg-amber-500/10 text-amber-100"}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] opacity-70">
                Janela de palpites
              </div>
              <div className="mt-1 text-sm md:text-base font-semibold">
                {predictionsOpen
                  ? "Você ainda pode registrar palpites."
                  : "Os palpites foram encerrados 1 hora antes do primeiro jogo."}
              </div>
            </div>
            <div className="text-sm font-bold">
              {predictionsOpen ? "Fecha em" : "Fechou em"} {predictionDeadline.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }).replace(",", " às")}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <section className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h2 className="text-xl md:text-2xl font-black text-white">Meu extrato de palpites</h2>
              </div>
              <p className="text-sm text-slate-400 max-w-2xl">
                Aqui ficam somente os seus palpites. Depois da janela de trava, este painel vira leitura apenas.
              </p>
            </div>
            <Badge variant="outline" className="text-slate-300 border-slate-700 bg-slate-800 self-start">
              {predictions.length} palpite{predictions.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-700/50 bg-slate-950/40 overflow-hidden">
            {myPredictions.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {myPredictions.map(({ match, prediction }: any) => {
                  const locked = !predictionsOpen;
                  return (
                    <div key={prediction.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.22em] bg-slate-800 text-slate-300">
                            {match.stage === "group_stage" ? friendlyGroupName(match.group_name || "GROUP_A") : STAGE_LABELS[match.stage] || match.stage || "Fase oficial"}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            {new Date(match.match_date).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).replace(",", " às")}
                          </span>
                        </div>
                        <div className="mt-2 text-sm md:text-base font-bold text-white truncate">
                          {match.team_a_name || match.team_a_code} x {match.team_b_name || match.team_b_code}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {match.stadium} • {match.city}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 min-w-[112px] text-center">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Seu palpite</div>
                          <div className="mt-1 text-2xl font-black text-white">
                            {prediction.predicted_score_a ?? "-"} x {prediction.predicted_score_b ?? "-"}
                          </div>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${locked ? "bg-slate-800 text-slate-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                          {locked ? "Travado" : "Editável"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 md:p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
                  <PencilLine className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Nenhum palpite salvo ainda.</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Quando você salvar um placar, ele aparece aqui como extrato pessoal.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {notice && (
        <div className={`rounded-2xl border p-4 text-sm font-medium ${notice.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" : "border-red-500/20 bg-red-500/10 text-red-200"}`}>
          {notice.message}
        </div>
      )}

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white">{section.title}</h2>
                <p className="text-xs md:text-sm text-slate-400">
                  {section.matches.length} partida{section.matches.length === 1 ? "" : "s"}
                </p>
              </div>
              <Badge variant="outline" className="text-slate-400 border-slate-700 bg-slate-800">
                {phaseFilter === "groups" ? "grupo ativo" : "agenda oficial"}
              </Badge>
            </div>
            <div className="grid gap-4 md:gap-6">
              {section.matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  predictionsOpen={predictionsOpen}
                  draft={drafts[match.id] || { home: "", away: "" }}
                  onDraftChange={(nextDraft) =>
                    setDrafts((current) => ({
                      ...current,
                      [match.id]: nextDraft,
                    }))
                  }
                  onSave={() => handleSavePrediction(match)}
                  saving={savingMatchId === match.id}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function buildAutoSections(matches: any[]) {
  const groupMatches = matches.filter((match) => match.stage === "group_stage");
  const knockoutMatches = matches.filter((match) => match.stage && match.stage !== "group_stage");
  const sections: Array<{ title: string; matches: any[] }> = [];

  const groupNames = GROUP_ORDER.filter((groupName) => groupMatches.some((match) => match.group_name === groupName));
  if (groupNames.length > 0) {
    sections.push(
      ...groupNames.map((groupName) => ({
        title: friendlyGroupName(groupName),
        matches: groupMatches.filter((match) => match.group_name === groupName),
      })),
    );
  }

  for (const stage of STAGE_ORDER) {
    if (stage === "group_stage") continue;
    const stageMatches = knockoutMatches.filter((match) => match.stage === stage);
    if (stageMatches.length > 0) {
      sections.push({ title: STAGE_LABELS[stage] || stage, matches: stageMatches });
    }
  }

  return sections;
}

function friendlyGroupName(groupName: string) {
  const suffix = groupName.replace("GROUP_", "");
  return `Grupo ${suffix}`;
}

function MatchCard({
  match,
  predictionsOpen,
  draft,
  onDraftChange,
  onSave,
  saving,
}: {
  match: any;
  predictionsOpen: boolean;
  draft: { home: string; away: string };
  onDraftChange: (draft: { home: string; away: string }) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const dateStr = new Date(match.match_date).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(".,", " •");

  const isFinished = FINISHED_MATCH_STATUSES.includes(match.status);
  const isLive = LIVE_MATCH_STATUSES.includes(match.status);
  const isOpen = OPEN_MATCH_STATUSES.includes(match.status);
  const stageLabel = match.stage === "group_stage"
    ? friendlyGroupName(match.group_name || "GROUP_A")
    : STAGE_LABELS[match.stage] || match.stage || "Fase oficial";
  const canEdit = predictionsOpen && !isFinished;

  return (
    <Card className={`overflow-hidden transition-all border-slate-700/50 rounded-2xl ${isFinished ? 'opacity-80 bg-slate-900/50' : 'bg-slate-800/80 relative shadow-lg'}`}>
      {!isFinished && (
        <div className="absolute inset-y-0 left-0 w-1 bg-yellow-500/80 pointer-events-none" />
      )}
      <CardContent className="p-3 sm:p-4 relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 bg-white/10 text-[9px] font-black rounded-full uppercase tracking-widest text-[#cbd5e1] border border-white/5 shrink-0">
                {stageLabel}
              </span>
              <span className="text-[11px] text-indigo-200 font-bold uppercase tracking-wide truncate">
                {dateStr}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-semibold truncate">
              {match.stadium} • {match.city}
            </div>
          </div>
          {isFinished ? (
            <Badge variant="outline" className="text-slate-500 border-slate-700 bg-slate-900 flex items-center h-7 shrink-0">
              <Lock className="w-3 h-3 mr-1" /> Encerrado
            </Badge>
          ) : isLive ? (
            <span className="text-[10px] font-black text-green-300 bg-green-500/10 px-2 py-1 rounded-full animate-pulse border border-green-500/20 shrink-0">AO VIVO</span>
          ) : isOpen ? (
            <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full shrink-0">ABERTO</span>
          ) : (
            <span className="text-[10px] font-black text-slate-400 bg-slate-900 px-2 py-1 rounded-full shrink-0">AGENDADO</span>
          )}
        </div>

        {(isFinished || isLive) && (
          <div className="mt-3 flex justify-center">
            <div className="bg-slate-950 border border-slate-700 px-3 py-1 rounded-full flex items-center gap-2">
              <span className="text-[9px] uppercase text-slate-500 font-bold">{isLive ? "Atual" : "Final"}</span>
              <span className="text-white font-black text-xs flex items-center gap-1.5">
                <TeamFlag flag={match.team_a_flag} />
                <span className="text-yellow-500">{match.home_goals ?? 0} x {match.away_goals ?? 0}</span>
                <TeamFlag flag={match.team_b_flag} />
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
          <TeamBlock flag={match.team_a_flag} label={match.team_a_name || match.team_a_code} align="right" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Input
              type="text"
              maxLength={2}
              inputMode="numeric"
              disabled={!canEdit}
              value={draft.home}
              onChange={(event) => onDraftChange({
                ...draft,
                home: sanitizeScoreInput(event.target.value),
              })}
              className="w-11 h-11 sm:w-12 sm:h-12 text-center text-xl font-black bg-slate-950/80 border-2 border-slate-600 focus-visible:border-yellow-500 disabled:opacity-100 text-white rounded-xl transition-colors shrink-0"
              placeholder="-"
            />
            <span className="text-white/50 font-black text-base shrink-0">X</span>
            <Input
              type="text"
              maxLength={2}
              inputMode="numeric"
              disabled={!canEdit}
              value={draft.away}
              onChange={(event) => onDraftChange({
                ...draft,
                away: sanitizeScoreInput(event.target.value),
              })}
              className="w-11 h-11 sm:w-12 sm:h-12 text-center text-xl font-black bg-slate-950/80 border-2 border-slate-600 focus-visible:border-yellow-500 disabled:opacity-100 text-white rounded-xl transition-colors shrink-0"
              placeholder="-"
            />
          </div>

          <TeamBlock flag={match.team_b_flag} label={match.team_b_name || match.team_b_code} align="left" />
        </div>

        {!isFinished && (
          <Button
            className="mt-4 w-full h-11 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase tracking-tight rounded-xl shadow-md transition-transform active:scale-95 text-xs disabled:opacity-60"
            disabled={!canEdit || saving}
            onClick={onSave}
          >
            {saving ? "Salvando..." : predictionsOpen ? "Salvar" : "Palpites encerrados"}
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TeamBlock({ flag, label, align }: { flag: string | null; label: string; align: "left" | "right" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end text-right" : "justify-start text-left"}`}>
      {align === "left" && <TeamFlag flag={flag} size="lg" />}
      <span className="min-w-0 truncate text-sm sm:text-base font-black text-white uppercase">
        {label}
      </span>
      {align === "right" && <TeamFlag flag={flag} size="lg" />}
    </div>
  );
}

function sanitizeScoreInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

function parseScore(value: string) {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function TeamFlag({ flag, size = "sm" }: { flag: string | null; size?: "sm" | "lg" }) {
  if (!flag) return <span className={size === "lg" ? "text-2xl" : "text-lg"}>🏳️</span>;
  if (flag.startsWith("http")) {
    return <img src={flag} alt="flag" className={`object-contain ${size === "lg" ? "w-8 h-8 sm:w-9 sm:h-9 rounded-sm shrink-0" : "w-5 h-5 rounded-sm inline-block"}`} />;
  }
  return <span className={size === "lg" ? "text-2xl sm:text-3xl shrink-0 inline-block" : "text-lg inline-block"}>{flag}</span>;
}
