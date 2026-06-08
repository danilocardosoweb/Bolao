import { supabaseAdmin } from "../lib/supabase-admin";

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_URL = "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE_ID = 1;
const SEASON = 2026;

export async function getTodayUsageCount() {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabaseAdmin
    .from('api_usage_logs')
    .select('requests_count')
    .eq('request_date', today);
    
  if (!data) return 0;
  return data.reduce((acc, log) => acc + log.requests_count, 0);
}

// Helper to log API usage
async function logApiUsage(endpoint: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin.rpc('increment_api_usage', {
    p_request_date: today,
    p_endpoint: endpoint
  });

  if (error) {
    // If RPC doesn't exist, do it manually
    const { data: usageDate } = await supabaseAdmin
      .from('api_usage_logs')
      .select('*')
      .eq('request_date', today)
      .eq('endpoint', endpoint)
      .single();

    if (usageDate) {
      await supabaseAdmin
        .from('api_usage_logs')
        .update({ requests_count: usageDate.requests_count + 1 })
        .eq('id', usageDate.id);
    } else {
      await supabaseAdmin
        .from('api_usage_logs')
        .insert({ request_date: today, endpoint, requests_count: 1 });
    }
  }
}

// Fetch generic
async function fetchApiFootball(endpoint: string) {
  if (!API_KEY) throw new Error("API_FOOTBALL_KEY is missing");
  
  const usage = await getTodayUsageCount();
  if (usage >= 100) {
    throw new Error("Daily limit reached");
  }
  
  await logApiUsage(endpoint);
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "x-rapidapi-host": "v3.football.api-sports.io",
      "x-rapidapi-key": API_KEY,
    }
  });
  
  const result = await response.json();
  if (result.errors && Object.keys(result.errors).length > 0) {
    throw new Error(JSON.stringify(result.errors));
  }
  return result.response;
}

// SYNC Teams
async function syncTeams() {
  const teamsData = await fetchApiFootball(`/teams?league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}`);
  
  for (const item of teamsData) {
    const t = item.team;
    await supabaseAdmin.from('teams').upsert(
      {
        api_id: t.id,
        name: t.name,
        code: t.code,
        flag: t.logo
      },
      { onConflict: 'api_id' }
    );
  }
}

// SYNC Fixtures
export async function syncWorldCupFixtures(date?: string) {
  const usageCount = await getTodayUsageCount();
  if (usageCount >= 100) return { success: false, count: 0, error: 'Daily limit reached' };

  let params = `league=${WORLD_CUP_LEAGUE_ID}&season=${SEASON}`;
  if (date) params += `&date=${date}`;
  
  const fixturesData = await fetchApiFootball(`/fixtures?${params}`);
  
  // Basic Cache: Get all teams
  const { data: teams } = await supabaseAdmin.from('teams').select('id, api_id, code, name, flag');
  let teamsMap: Record<number, any> = {};
  if (teams) {
    teamsMap = teams.reduce((acc, t) => { acc[t.api_id] = t; return acc; }, {});
  }
  
  // Get existing matches to check for changes
  const { data: existingMatches } = await supabaseAdmin.from('matches').select('id, api_fixture_id, home_goals, away_goals, status');
  const existingMap: Record<number, any> = {};
  if (existingMatches) {
    existingMatches.forEach(m => existingMap[m.api_fixture_id] = m);
  }
  
  for (const f of fixturesData) {
    const fixture = f.fixture;
    const league = f.league;
    const homeTeam = f.teams.home;
    const awayTeam = f.teams.away;
    const goals = f.goals;
    const status = fixture.status.short; // FT, NS, etc.

    const hTeam = teamsMap[homeTeam.id];
    const aTeam = teamsMap[awayTeam.id];
    
    const existingMatch = existingMap[fixture.id];
    let changed = false;

    if (existingMatch) {
      if (existingMatch.home_goals !== goals.home || existingMatch.away_goals !== goals.away || existingMatch.status !== status) {
        changed = true;
      }
      const finishedStatuses = ['FT', 'AET', 'PEN'];
      if (finishedStatuses.includes(existingMatch.status) && !changed) {
        continue;
      }
    } else {
      changed = true;
    }

    const { data: savedMatch, error } = await supabaseAdmin.from('matches').upsert(
      {
        api_fixture_id: fixture.id,
        home_team_id: hTeam?.id || null,
        away_team_id: aTeam?.id || null,
        team_a_code: homeTeam.name.substring(0,3).toUpperCase(),
        team_b_code: awayTeam.name.substring(0,3).toUpperCase(),
        team_a_name: homeTeam.name,
        team_b_name: awayTeam.name,
        team_a_flag: homeTeam.logo,
        team_b_flag: awayTeam.logo,
        match_date: fixture.date,
        stadium: fixture.venue.name,
        city: fixture.venue.city,
        stage: determineStage(league.round),
        group_name: league.round,
        home_goals: goals.home,
        away_goals: goals.away,
        status: status
      },
      { onConflict: 'api_fixture_id' }
    ).select().single();

    if (savedMatch && changed) {
      import('./scoringEngine').then(mod => {
        mod.calculateMatchPoints(savedMatch.id).catch(console.error);
      });
    }
  }
  
  return { success: true, count: fixturesData.length };
}

function determineStage(roundInfo: string) {
  const round = roundInfo.toLowerCase();
  if (round.includes('group')) return 'group_stage';
  if (round.includes('16')) return 'round_of_16';
  if (round.includes('quarter')) return 'quarter_finals';
  if (round.includes('semi')) return 'semi_finals';
  if (round.includes('3rd') || round.includes('third')) return 'third_place';
  if (round.includes('final')) return 'final';
  return 'group_stage';
}

export async function getApiUsageStats() {
  const { data } = await supabaseAdmin.from('api_usage_logs').select('*');
  return data;
}
