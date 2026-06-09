import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Clock3,
  Crown,
  Handshake,
  MapPin,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { appLogoSrc } from "@/src/lib/brand";
import { useSupabase } from "@/src/lib/supabase-provider";
import { AuthModal } from "@/src/features/auth/AuthModal";

type LandingPageProps = {
  onEnterApp: () => void;
};

const OPEN_MATCH_STATUSES = ["NS", "TBD", "SCHEDULED", "TIMED"];
const LIVE_MATCH_STATUSES = ["LIVE", "1H", "HT", "2H", "ET", "BT", "P"];

const formatMatchDay = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

const formatMatchTime = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const getLocalDateKey = (value: string) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const featureCards = [
  {
    icon: Target,
    title: "Palpites em todos os jogos",
    description: "Agenda completa da Copa com datas, horarios, estadios e status atualizados.",
  },
  {
    icon: BarChart3,
    title: "Ranking ao vivo",
    description: "Acompanhe a subida na tabela conforme os resultados oficiais forem entrando.",
  },
  {
    icon: Zap,
    title: "Pontuacao inteligente",
    description: "Acerto exato, vencedor, saldo e gols parciais em uma regra unica e clara.",
  },
  {
    icon: ShieldCheck,
    title: "Area administrativa",
    description: "Sincronize partidas, revise resultados e mantenha o bolao organizado sem atrito.",
  },
  {
    icon: Smartphone,
    title: "Pronto para celular",
    description: "Fluxo pensado para uso rapido no telefone, no intervalo, no cafe ou no grupo da equipe.",
  },
  {
    icon: Crown,
    title: "Vence quem entende o jogo",
    description: "A interface destaca o essencial para voce acompanhar o que realmente importa.",
  },
];

const scoreCards = [
  {
    value: "+10",
    title: "Acerto exato",
    description: "Quando o placar fica igual ao jogo real.",
  },
  {
    value: "+7",
    title: "Vencedor e saldo",
    description: "Acertou o vencedor e a diferenca exata de gols.",
  },
  {
    value: "+5",
    title: "Vencedor ou empate",
    description: "Quem leva a partida, mesmo sem cravar o placar.",
  },
  {
    value: "+2",
    title: "Placar parcial",
    description: "Acertou um lado do resultado e ainda pontua.",
  },
  {
    value: "0",
    title: "Errou tudo",
    description: "Sem acerto relacionado ao resultado da partida.",
  },
];

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const { matches, rankings, loading, session, signOut } = useSupabase();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const topRef = useRef<HTMLDivElement | null>(null);
  const scheduleRef = useRef<HTMLDivElement | null>(null);

  const openMatches = useMemo(
    () => matches.filter((match) => OPEN_MATCH_STATUSES.includes(match.status)),
    [matches],
  );

  const liveMatches = useMemo(
    () => matches.filter((match) => LIVE_MATCH_STATUSES.includes(match.status)),
    [matches],
  );

  const upcomingMatches = useMemo(() => {
    return [...openMatches]
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      .slice(0, 3);
  }, [openMatches]);

  const landingScheduleGroups = useMemo(() => {
    const sourceMatches = [...matches]
      .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
      .slice(0, 12);

    const groups = sourceMatches.reduce<
      Array<{
        key: string;
        label: string;
        matches: typeof sourceMatches;
      }>
    >((acc, match) => {
      const key = getLocalDateKey(match.match_date);
      const existingGroup = acc.find((group) => group.key === key);

      if (existingGroup) {
        existingGroup.matches.push(match);
        return acc;
      }

      acc.push({
        key,
        label: new Date(match.match_date).toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        }),
        matches: [match],
      });

      return acc;
    }, []);

    return groups.slice(0, 4);
  }, [matches]);

  const topRanking = rankings[0];
  const topPoints = topRanking?.total_points ?? 0;
  const topUser = topRanking?.user_id?.slice(0, 8) ?? "AGUARDANDO";
  const liveCount = liveMatches.length;
  const isAuthenticated = Boolean(session);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleSignedIn = () => {
    setAuthOpen(false);
    onEnterApp();
  };

  const handleEnter = () => {
    if (isAuthenticated) {
      onEnterApp();
      return;
    }
    openAuth("signin");
  };

  const handleCreateAccount = async () => {
    if (isAuthenticated) {
      await signOut();
      return;
    }
    openAuth("signup");
  };

  const handlePrimaryCta = () => {
    if (isAuthenticated) {
      onEnterApp();
      return;
    }
    openAuth("signup");
  };

  const scrollToSection = (target: HTMLDivElement | null) => {
    if (!target) {
      return;
    }

    const top = target.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  };

  return (
    <div ref={topRef} className="min-h-screen bg-[#f4f0e8] text-[#071b0e] font-ui">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#f4f0e8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => scrollToSection(topRef.current)}
            className="flex items-center gap-3 text-left transition-transform hover:scale-[1.01]"
          >
            <img
              src={appLogoSrc}
              alt="Logo TecnoPerfil Bolao Copa 2026"
              className="h-14 w-auto object-contain sm:h-16"
            />
          </button>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={handleEnter}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#071b0e] transition-colors hover:bg-black/5"
            >
              {isAuthenticated ? "Ir para o painel" : "Entrar"}
            </button>
            <button
              onClick={handleCreateAccount}
              className="rounded-full bg-[#071b0e] px-5 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-[#f8f1df] shadow-[0_14px_30px_rgba(7,27,14,0.28)] transition-transform hover:scale-[1.01]"
            >
              {isAuthenticated ? "Sair" : "Criar conta"}
            </button>
          </div>
        </div>
      </header>

      <main className="landing-grid">
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ffc21f]/50 bg-[#0b2d17]/90 px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.3em] text-[#ffc21f] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                  <Sparkles className="h-4 w-4" />
                  TecnoPerfil entra em campo • Copa 2026
                </div>

                <div className="mt-7 max-w-4xl">
                  <h1 className="font-display text-6xl uppercase leading-[0.86] text-[#f8f1df] drop-shadow-[0_16px_35px_rgba(0,0,0,0.4)] sm:text-7xl lg:text-[7.5rem]">
                    Bolao TecnoPerfil.
                    <span className="block text-[#ffc21f]">Domine o ranking.</span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d8e1d4] sm:text-xl">
                    Um desafio interno para aproximar a equipe, provocar aquela resenha boa
                    e descobrir quem entende mesmo de Copa. Palpite nos jogos, acompanhe
                    sua pontuacao e brigue pelo topo do ranking da TecnoPerfil.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handlePrimaryCta}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#ffc21f] px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-[#071b0e] shadow-[0_20px_50px_rgba(255,194,31,0.28)] transition-transform hover:-translate-y-0.5"
                  >
                    Comecar agora
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#landing-schedule"
                    className="landing-cta-link inline-flex items-center justify-center gap-3 rounded-2xl border border-[#f8f1df]/30 bg-white/5 px-8 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[#f8f1df] backdrop-blur-sm transition-colors hover:border-[#ffc21f]/60 hover:bg-white/10"
                  >
                    <Play className="landing-cta-link__icon h-4 w-4" />
                    <span className="landing-cta-link__label">Ver jogos</span>
                  </a>
                </div>

              </div>

              <div className="relative">
                <div className="absolute -left-10 top-12 h-32 w-32 rounded-full bg-[#ffc21f]/20 blur-3xl" />
                <div className="absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-[#0e3b1c]/70 blur-3xl" />

                <div className="landing-card-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6 lg:p-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#9fbc9f]">
                        Proximos jogos
                      </p>
                      <h2 className="mt-2 font-display text-4xl uppercase text-white">
                        Agenda oficial
                      </h2>
                    </div>
                    <div className="rounded-full border border-[#ffc21f]/30 bg-[#ffc21f]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#ffc21f]">
                      {liveCount > 0 ? `${liveCount} ao vivo` : "Calendario pronto"}
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {loading && upcomingMatches.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[#d9e5d7]">
                        Carregando calendario oficial...
                      </div>
                    ) : upcomingMatches.length > 0 ? (
                      upcomingMatches.map((match) => (
                        <div
                          key={match.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-transform hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9fbc9f]">
                                {match.stage || match.group_name || "Fase oficial"}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-white">
                                {(match.team_a_code || match.team_a_name || "Time A").toString()}{" "}
                                <span className="mx-2 text-[#ffc21f]">x</span>{" "}
                                {(match.team_b_code || match.team_b_name || "Time B").toString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-white">
                                {formatMatchDay(match.match_date)}
                              </div>
                              <div className="text-xs text-[#9fbc9f]">
                                {formatMatchTime(match.match_date)}{" "}
                                • {match.stadium}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-[#d9e5d7]">
                        Nenhum jogo aberto agora. A base ja esta pronta para receber novos
                        resultados.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9fbc9f]">
                        Lider atual
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">{topPoints.toLocaleString("pt-BR")} pts</div>
                      <div className="text-sm text-[#d9e5d7]">{topUser}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9fbc9f]">
                        Base sincronizada
                      </div>
                      <div className="mt-2 text-2xl font-black text-white">{matches.length || 104}</div>
                      <div className="text-sm text-[#d9e5d7]">
                        {matches.length > 0 ? "Jogos reais no Supabase" : "Aguardando leitura da base"}
                      </div>
                    </div>
                  </div>

                  <a
                    href="#landing-schedule"
                    className="landing-cta-link mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ffc21f]/25 bg-[#ffc21f]/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-[#ffc21f] transition-colors hover:bg-[#ffc21f]/15"
                  >
                    <span className="landing-cta-link__label">Ver agenda completa</span>
                    <ChevronRight className="landing-cta-link__icon h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="landing-schedule"
          ref={scheduleRef}
          className="scroll-mt-24 bg-[#091d10] py-16 text-[#f8f1df] sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#ffc21f]">
                  Agenda da competicao
                </p>
                <h2 className="mt-4 font-display text-5xl uppercase leading-none text-white sm:text-6xl">
                  Veja os jogos sem sair da pagina
                </h2>
                <p className="mt-5 text-base leading-7 text-[#c7d6c8] sm:text-lg">
                  O botao agora leva voce para uma agenda mais completa, com dias separados,
                  horario, estadio e um visual melhor para navegar no celular.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9fbc9f]">
                    Dias visiveis
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">{landingScheduleGroups.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9fbc9f]">
                    Jogos listados
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">
                    {landingScheduleGroups.reduce((total, group) => total + group.matches.length, 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9fbc9f]">
                    Desafio interno
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-lg font-black uppercase tracking-[0.08em] text-[#ffc21f]">
                    <Users className="h-4 w-4" />
                    Time TecnoPerfil
                  </div>
                  <div className="mt-2 text-sm font-medium leading-6 text-[#d9e5d7]">
                    Ranking, resenha e disputa rodada apos rodada.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-5 xl:grid-cols-2">
              {landingScheduleGroups.length > 0 ? (
                landingScheduleGroups.map((group) => (
                  <article
                    key={group.key}
                    className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,40,24,0.96),rgba(10,23,14,0.98))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.22)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.28em] text-[#9fbc9f]">
                          {group.label}
                        </div>
                        <h3 className="mt-2 font-display text-3xl uppercase text-white">
                          {group.matches.length} partidas no dia
                        </h3>
                      </div>
                      <div className="rounded-full border border-[#ffc21f]/25 bg-[#ffc21f]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#ffc21f]">
                        {liveCount > 0 ? "agenda ativa" : "agenda oficial"}
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {group.matches.map((match) => (
                        <div
                          key={match.id}
                          className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#9fbc9f]">
                                {match.group_name || match.stage || "Fase oficial"}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-lg font-black uppercase text-white">
                                <span>{match.team_a_name || match.team_a_code || "Time A"}</span>
                                <span className="text-[#ffc21f]">x</span>
                                <span>{match.team_b_name || match.team_b_code || "Time B"}</span>
                              </div>
                            </div>

                            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#ffc21f]">
                              {LIVE_MATCH_STATUSES.includes(match.status) ? "ao vivo" : "programado"}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 text-sm text-[#d9e5d7] sm:grid-cols-2">
                            <div className="flex items-center gap-2">
                              <Clock3 className="h-4 w-4 text-[#ffc21f]" />
                              <span>
                                {formatMatchDay(match.match_date)} • {formatMatchTime(match.match_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-[#ffc21f]" />
                              <span>
                                {match.stadium || "Estadio oficial"}
                                {match.city ? ` • ${match.city}` : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-base text-[#d9e5d7] xl:col-span-2">
                  A agenda oficial ainda nao apareceu aqui, mas a landing ja esta pronta para
                  mostrar os jogos assim que a base terminar de carregar.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-[#f4f0e8] py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 rounded-[2rem] border border-[#123a20]/15 bg-white/70 p-5 shadow-[0_20px_60px_rgba(7,27,14,0.08)] md:grid-cols-[auto_1fr_auto] md:items-center md:p-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#083319] text-[#ffc21f]">
                <Handshake className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#1f4b27]">
                  Desafio interno TecnoPerfil
                </p>
                <h2 className="mt-2 font-display text-4xl uppercase leading-none text-[#071b0e]">
                  Chame o pessoal, monte seus palpites e entre na disputa.
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                  O bolao e uma forma simples de juntar a equipe em torno da Copa:
                  cada rodada vira assunto, cada acerto mexe no ranking e todo mundo
                  acompanha pelo celular.
                </p>
              </div>
              <button
                onClick={handlePrimaryCta}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#071b0e] px-6 text-sm font-black uppercase tracking-[0.12em] text-[#f8f1df] transition-transform hover:-translate-y-0.5"
              >
                Participar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-[#f1eee3] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-bold uppercase tracking-[0.28em] text-[#1f4b27]">
                TecnoPerfil em modo Copa
              </p>
              <h2 className="mt-4 font-display text-5xl uppercase text-[#071b0e] sm:text-6xl">
                Sistema completo de palpites
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-700">
                Um visual organizado e direto ao ponto para todo mundo participar sem complicacao,
                acompanhar os colegas e torcer pela proxima virada no ranking.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className="landing-card rounded-[1.75rem] border border-black/8 p-6 transition-transform hover:-translate-y-1"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#083319] text-[#ffc21f] shadow-[0_16px_40px_rgba(7,27,14,0.18)]">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-6 font-display text-3xl uppercase leading-none text-[#071b0e]">
                      {card.title}
                    </h3>
                    <p className="mt-4 text-base leading-7 text-slate-700">{card.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f4eb] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 text-center">
              <p className="font-bold uppercase tracking-[0.28em] text-[#1f4b27]">Como pontuar</p>
              <h2 className="font-display text-5xl uppercase text-[#071b0e] sm:text-6xl">
                Regras claras, sem surpresa
              </h2>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {scoreCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[1.75rem] border border-black/8 bg-white p-6 text-center shadow-[0_20px_60px_rgba(7,27,14,0.08)]"
                >
                  <div className="font-display text-6xl uppercase text-[#1d5f2f]">{card.value}</div>
                  <h3 className="mt-5 font-display text-3xl uppercase text-[#071b0e]">{card.title}</h3>
                  <p className="mt-4 text-slate-600">{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#071b0e] py-24 text-[#f8f1df]">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffc21f]/30 bg-[#ffc21f]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-[#ffc21f]">
              <Sparkles className="h-4 w-4" />
              Pronto para jogar?
            </div>
            <h2 className="mt-6 font-display text-6xl uppercase leading-[0.9] sm:text-7xl">
              Entre agora e comece a subir no ranking
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#d1ddce]">
              Acesse o painel, veja os jogos oficiais e comece a montar seus palpites.
              A experiencia foi pensada para ficar bonita, rapida e direta no celular ou no desktop.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    onClick={handlePrimaryCta}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#ffc21f] px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-[#071b0e] transition-transform hover:-translate-y-0.5"
                  >
                    Comecar agora
                <ChevronRight className="h-4 w-4" />
              </button>
              <a
                href="#landing-schedule"
                className="landing-cta-link inline-flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-sm font-bold uppercase tracking-[0.14em] text-[#f8f1df] backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                <span className="landing-cta-link__label">Ver calendario</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleSignedIn}
      />
    </div>
  );
}
