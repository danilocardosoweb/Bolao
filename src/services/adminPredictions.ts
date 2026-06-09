import { supabaseAdmin } from "../lib/supabase-admin";
import type {
  AdminMatchCoverage,
  AdminParticipantSummary,
  AdminPredictionRecord,
  AdminPredictionsReport,
  AdminPredictionSummary,
} from "../types/admin";

type AuthUserLike = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type MatchRow = {
  id: string;
  match_date: string | null;
  status: string | null;
  stage: string | null;
  group_name: string | null;
  stadium: string | null;
  city: string | null;
  team_a_name: string | null;
  team_a_code: string | null;
  team_b_name: string | null;
  team_b_code: string | null;
  home_goals: number | null;
  away_goals: number | null;
};

type PredictionRow = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_score_a: number | null;
  predicted_score_b: number | null;
  status: string | null;
  points_earned: number | null;
  base_points: number | null;
  multiplier_applied: number | null;
  created_at: string | null;
  updated_at: string | null;
  matches: MatchRow | MatchRow[] | null;
};

type RankingRow = {
  user_id: string;
  total_points: number | null;
  exact_matches: number | null;
  correct_results: number | null;
};

type PublicUserRow = {
  id: string;
  email: string | null;
  role: string | null;
  created_at: string | null;
};

const PER_PAGE = 200;

function getDisplayName(user: AuthUserLike) {
  const metadata = user.user_metadata || {};
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const fallback = user.email ? user.email.split("@")[0] : "Participante";
  return fullName || fallback;
}

function normalizeMatch(match: MatchRow | MatchRow[] | null): MatchRow | null {
  if (!match) return null;
  return Array.isArray(match) ? match[0] ?? null : match;
}

export async function listAdminUsers() {
  const allUsers: AuthUserLike[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });

    if (error) {
      throw error;
    }

    const users = (data.users || []) as AuthUserLike[];
    allUsers.push(...users);

    if (users.length < PER_PAGE) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

function getFallbackDisplayName(userId: string) {
  return `Participante ${userId.slice(0, 8)}`;
}

export async function buildAdminPredictionsReport(): Promise<AdminPredictionsReport> {
  const [usersResult, registeredUsersResult, matchesResult, predictionsResult, rankingsResult] =
    await Promise.all([
    listAdminUsers().catch((error) => {
      console.warn("[Admin Predictions] Falling back without auth user directory:", error.message);
      return [] as AuthUserLike[];
    }),
    supabaseAdmin.from("users").select("id, email, role, created_at").order("created_at", {
      ascending: true,
    }),
    supabaseAdmin
      .from("matches")
      .select(
        "id, match_date, status, stage, group_name, stadium, city, team_a_name, team_a_code, team_b_name, team_b_code, home_goals, away_goals",
      )
      .order("match_date", { ascending: true }),
    supabaseAdmin
      .from("predictions")
      .select(
        "id, user_id, match_id, predicted_score_a, predicted_score_b, status, points_earned, base_points, multiplier_applied, created_at, updated_at, matches(id, match_date, status, stage, group_name, stadium, city, team_a_name, team_a_code, team_b_name, team_b_code, home_goals, away_goals)",
      )
      .order("updated_at", { ascending: false }),
    supabaseAdmin
      .from("rankings")
      .select("user_id, total_points, exact_matches, correct_results"),
    ]);

  if (registeredUsersResult.error) throw registeredUsersResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (predictionsResult.error) throw predictionsResult.error;
  if (rankingsResult.error) throw rankingsResult.error;

  const users = usersResult;
  const registeredUsers = (registeredUsersResult.data || []) as PublicUserRow[];
  const matches = (matchesResult.data || []) as MatchRow[];
  const predictions = (predictionsResult.data || []) as PredictionRow[];
  const rankings = (rankingsResult.data || []) as RankingRow[];

  const usersById = new Map(users.map((user) => [user.id, user]));
  const registeredUsersById = new Map(registeredUsers.map((user) => [user.id, user]));
  const rankingsByUserId = new Map(rankings.map((row) => [row.user_id, row]));
  const predictionsByUserId = new Map<string, PredictionRow[]>();
  const predictionsByMatchId = new Map<string, PredictionRow[]>();
  const allUserIds = new Set<string>();

  for (const user of users) {
    allUserIds.add(user.id);
  }

  for (const user of registeredUsers) {
    allUserIds.add(user.id);
  }

  for (const prediction of predictions) {
    allUserIds.add(prediction.user_id);
    const userPredictions = predictionsByUserId.get(prediction.user_id) || [];
    userPredictions.push(prediction);
    predictionsByUserId.set(prediction.user_id, userPredictions);

    const matchPredictions = predictionsByMatchId.get(prediction.match_id) || [];
    matchPredictions.push(prediction);
    predictionsByMatchId.set(prediction.match_id, matchPredictions);
  }

  for (const ranking of rankings) {
    allUserIds.add(ranking.user_id);
  }

  const totalParticipants = allUserIds.size;

  const participantSummaries: AdminParticipantSummary[] = Array.from(allUserIds)
    .map((userId) => {
      const user = usersById.get(userId);
      const registeredUser = registeredUsersById.get(userId);
      const userPredictions = predictionsByUserId.get(userId) || [];
      const ranking = rankingsByUserId.get(userId);
      const completedPredictions = userPredictions.filter(
        (prediction) =>
          prediction.predicted_score_a !== null && prediction.predicted_score_b !== null,
      ).length;
      const pendingPredictions = userPredictions.filter(
        (prediction) =>
          prediction.predicted_score_a === null || prediction.predicted_score_b === null,
      ).length;
      const scoredPredictions = userPredictions.filter(
        (prediction) => (prediction.points_earned || 0) > 0,
      ).length;
      const latest = userPredictions.reduce<string | null>((current, prediction) => {
        const candidate = prediction.updated_at || prediction.created_at;
        if (!candidate) return current;
        if (!current) return candidate;
        return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
      }, null);

      return {
        userId,
        email: user?.email || registeredUser?.email || "",
        displayName: user
          ? getDisplayName(user)
          : registeredUser?.email
            ? registeredUser.email.split("@")[0]
            : getFallbackDisplayName(userId),
        totalPredictions: userPredictions.length,
        completedPredictions,
        pendingPredictions,
        scoredPredictions,
        totalPoints: ranking?.total_points || 0,
        exactMatches: ranking?.exact_matches || 0,
        correctResults: ranking?.correct_results || 0,
        completionRate:
          matches.length > 0 ? Math.round((userPredictions.length / matches.length) * 100) : 0,
        lastPredictionAt: latest,
        createdAt: user?.created_at || registeredUser?.created_at || null,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
      return a.displayName.localeCompare(b.displayName);
    });

  const detailedPredictions: AdminPredictionRecord[] = predictions.map((prediction) => {
    const user = usersById.get(prediction.user_id);
    const registeredUser = registeredUsersById.get(prediction.user_id);
    const match = normalizeMatch(prediction.matches);
    return {
      id: prediction.id,
      userId: prediction.user_id,
      email: user?.email || registeredUser?.email || "",
      displayName: user
        ? getDisplayName(user)
        : registeredUser?.email
          ? registeredUser.email.split("@")[0]
          : getFallbackDisplayName(prediction.user_id),
      predictedScoreA: prediction.predicted_score_a,
      predictedScoreB: prediction.predicted_score_b,
      pointsEarned: prediction.points_earned || 0,
      basePoints: prediction.base_points || 0,
      multiplierApplied: Number(prediction.multiplier_applied || 1),
      predictionStatus: prediction.status || "pending",
      createdAt: prediction.created_at,
      updatedAt: prediction.updated_at,
      matchId: prediction.match_id,
      matchDate: match?.match_date || null,
      matchStatus: match?.status || null,
      stage: match?.stage || null,
      groupName: match?.group_name || null,
      stadium: match?.stadium || null,
      city: match?.city || null,
      teamAName: match?.team_a_name || null,
      teamACode: match?.team_a_code || null,
      teamBName: match?.team_b_name || null,
      teamBCode: match?.team_b_code || null,
      officialScoreA: match?.home_goals || null,
      officialScoreB: match?.away_goals || null,
    };
  });

  const matchCoverage: AdminMatchCoverage[] = matches
    .map((match) => {
      const matchPredictions = predictionsByMatchId.get(match.id) || [];
      const scoredPredictionCount = matchPredictions.filter(
        (prediction) => (prediction.points_earned || 0) > 0,
      ).length;
      const predictionCount = matchPredictions.length;

      return {
        matchId: match.id,
        matchDate: match.match_date,
        matchStatus: match.status,
        stage: match.stage,
        groupName: match.group_name,
        stadium: match.stadium,
        city: match.city,
        teamAName: match.team_a_name,
        teamACode: match.team_a_code,
        teamBName: match.team_b_name,
        teamBCode: match.team_b_code,
        predictionCount,
        scoredPredictionCount,
        missingParticipants: Math.max(totalParticipants - predictionCount, 0),
        coverageRate:
          totalParticipants > 0 ? Math.round((predictionCount / totalParticipants) * 100) : 0,
      };
    })
    .sort((a, b) => {
      if (a.coverageRate !== b.coverageRate) return a.coverageRate - b.coverageRate;
      return new Date(a.matchDate || 0).getTime() - new Date(b.matchDate || 0).getTime();
    });

  const totalCompletionRate =
    participantSummaries.length > 0
      ? Math.round(
          participantSummaries.reduce((sum, participant) => sum + participant.completionRate, 0) /
            participantSummaries.length,
        )
      : 0;

  const lastPredictionAt = detailedPredictions.reduce<string | null>((current, prediction) => {
    const candidate = prediction.updatedAt || prediction.createdAt;
    if (!candidate) return current;
    if (!current) return candidate;
    return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
  }, null);

  const summary: AdminPredictionSummary = {
    participants: participantSummaries.length,
    matches: matches.length,
    predictions: detailedPredictions.length,
    averageCompletionRate: totalCompletionRate,
    matchesWithoutPredictions: matchCoverage.filter((match) => match.predictionCount === 0).length,
    lastPredictionAt,
  };

  return {
    summary,
    participants: participantSummaries,
    predictions: detailedPredictions,
    coverage: matchCoverage,
    generatedAt: new Date().toISOString(),
  };
}
