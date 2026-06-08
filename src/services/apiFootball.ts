import "../lib/env";
import { STADIUM_TO_CITY, WORLD_CUP_2026_STADIUM_ORDER } from "../data/worldCup2026";
import { supabaseAdmin } from "../lib/supabase-admin";

const API_KEY = process.env.FOOTBALL_DATA_TOKEN || process.env.API_FOOTBALL_KEY;
const API_URL = "https://api.football-data.org/v4";
const WORLD_CUP_COMPETITION_CODE = "WC";

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  competition: { code: string; name: string; id: number };
  season: { startDate: string; endDate: string; currentMatchday: number };
  venue?: string | null;
  score: { fullTime: { home: number | null; away: number | null } };
  homeTeam: { id: number; name: string; tla?: string | null };
  awayTeam: { id: number; name: string; tla?: string | null };
  group?: string | null;
};

function normalizeStatus(status: string) {
  const map: Record<string, string> = {
    SCHEDULED: "NS",
    TIMED: "NS",
    IN_PLAY: "LIVE",
    PAUSED: "HT",
    FINISHED: "FT",
    POSTPONED: "TBD",
    SUSPENDED: "TBD",
    CANCELLED: "TBD"
  };
  return map[status] || status;
}

function determineStage(group?: string | null, matchday?: number | null) {
  const value = `${group || ""} ${matchday || ""}`.toLowerCase();
  if (value.includes("round of 16")) return "round_of_16";
  if (value.includes("quarter")) return "quarter_finals";
  if (value.includes("semi")) return "semi_finals";
  if (value.includes("third")) return "third_place";
  if (value.includes("final")) return "final";
  return "group_stage";
}

async function getTodayUsageCount() {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabaseAdmin
    .from("api_usage_logs")
    .select("requests_count")
    .eq("request_date", today);

  if (!data) return 0;
  return data.reduce((acc, log) => acc + log.requests_count, 0);
}

async function logApiUsage(endpoint: string) {
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabaseAdmin.rpc("increment_api_usage", {
    p_request_date: today,
    p_endpoint: endpoint
  });

  if (error) {
    const { data: usageDate } = await supabaseAdmin
      .from("api_usage_logs")
      .select("*")
      .eq("request_date", today)
      .eq("endpoint", endpoint)
      .single();

    if (usageDate) {
      await supabaseAdmin
        .from("api_usage_logs")
        .update({ requests_count: usageDate.requests_count + 1 })
        .eq("id", usageDate.id);
    } else {
      await supabaseAdmin
        .from("api_usage_logs")
        .insert({ request_date: today, endpoint, requests_count: 1 });
    }
  }
}

async function fetchFootballData(endpoint: string) {
  if (!API_KEY) throw new Error("FOOTBALL_DATA_TOKEN is missing");

  const usage = await getTodayUsageCount();
  if (usage >= 100) {
    throw new Error("Daily limit reached");
  }

  await logApiUsage(endpoint);

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "X-Auth-Token": API_KEY
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `football-data.org request failed (${response.status})`);
  }

  return response.json();
}

async function upsertMatches(matches: FootballDataMatch[]) {
  const orderedMatches = [...matches].sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
  const { data: teams } = await supabaseAdmin.from("teams").select("id, api_id, code, name, flag");
  const teamsMap: Record<number, any> = {};
  if (teams) {
    teams.forEach((t) => {
      teamsMap[t.api_id] = t;
    });
  }

  const { data: existingMatches } = await supabaseAdmin
    .from("matches")
    .select("id, api_fixture_id, home_goals, away_goals, status");
  const existingMap: Record<number, any> = {};
  if (existingMatches) {
    existingMatches.forEach((m) => {
      existingMap[m.api_fixture_id] = m;
    });
  }

  let savedCount = 0;
  for (const [index, item] of orderedMatches.entries()) {
    if (item.competition.code !== WORLD_CUP_COMPETITION_CODE) continue;

    const fixture = item;
    const homeTeam = item.homeTeam;
    const awayTeam = item.awayTeam;
    const status = normalizeStatus(item.status);
    const homeGoals = item.score.fullTime.home;
    const awayGoals = item.score.fullTime.away;
    const groupName = item.group || "";
    const stage = determineStage(groupName, item.season.currentMatchday);
    const hTeam = teamsMap[homeTeam.id];
    const aTeam = teamsMap[awayTeam.id];
    const stadium = WORLD_CUP_2026_STADIUM_ORDER[index] || item.venue || "";
    const city = STADIUM_TO_CITY[stadium] || "";

    const existingMatch = existingMap[fixture.id];
    let changed = !existingMatch;
    if (existingMatch) {
      changed =
        existingMatch.home_goals !== homeGoals ||
        existingMatch.away_goals !== awayGoals ||
        existingMatch.status !== status;
      const finishedStatuses = ["FT", "AET", "PEN"];
      if (finishedStatuses.includes(existingMatch.status) && !changed) {
        continue;
      }
    }

    const { data: savedMatch } = await supabaseAdmin.from("matches").upsert(
      {
        api_fixture_id: fixture.id,
        league_id: fixture.competition.id,
        season: new Date(item.season.startDate).getFullYear(),
        home_team_id: hTeam?.id || null,
        away_team_id: aTeam?.id || null,
        team_a_code: homeTeam.tla || homeTeam.name.substring(0, 3).toUpperCase(),
        team_b_code: awayTeam.tla || awayTeam.name.substring(0, 3).toUpperCase(),
        team_a_name: homeTeam.name,
        team_b_name: awayTeam.name,
        team_a_flag: hTeam?.flag || "",
        team_b_flag: aTeam?.flag || "",
        match_date: item.utcDate,
        stadium,
        city,
        stage,
        group_name: groupName,
        home_goals: homeGoals,
        away_goals: awayGoals,
        status
      },
      { onConflict: "api_fixture_id" }
    ).select().single();

    if (savedMatch && changed) {
      import("./scoringEngine").then((mod) => {
        mod.calculateMatchPoints(savedMatch.id).catch(console.error);
      });
    }

    savedCount += 1;
  }

  return savedCount;
}

async function syncTeams(competitionCode: string) {
  const data = await fetchFootballData(`/competitions/${competitionCode}/teams`);
  const teams = data.teams || [];

  for (const team of teams) {
    await supabaseAdmin.from("teams").upsert(
      {
        api_id: team.id,
        name: team.name,
        code: team.tla || team.shortName || team.name.substring(0, 3).toUpperCase(),
        flag: team.crest
      },
      { onConflict: "api_id" }
    );
  }
}

export async function syncWorldCupFixtures(date?: string) {
  const usageCount = await getTodayUsageCount();
  if (usageCount >= 100) return { success: false, count: 0, error: "Daily limit reached" };

  try {
    await syncTeams(WORLD_CUP_COMPETITION_CODE);
    const data = await fetchFootballData(`/competitions/${WORLD_CUP_COMPETITION_CODE}/matches`);
    const matches = (data.matches || []) as FootballDataMatch[];

    const filtered = date
      ? matches.filter((match) => match.utcDate.startsWith(date))
      : matches;

    const savedCount = await upsertMatches(filtered);
    return { success: true, count: savedCount, source: "football-data" };
  } catch (error: any) {
    console.warn("[football-data] Sync failed:", error?.message || error);
    return { success: false, count: 0, error: error?.message || "football-data sync failed", source: "football-data" };
  }
}

export async function getApiUsageStats() {
  const { data } = await supabaseAdmin.from("api_usage_logs").select("*");
  return data;
}
