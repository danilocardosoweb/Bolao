import { calculateMatchScore, MatchStage } from "../lib/scoring";
import { supabaseAdmin } from "../lib/supabase-admin";

const FINISHED_MATCH_STATUSES = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function calculateMatchPoints(matchId: string) {
  // 1. Get the match result
  const { data: match } = await supabaseAdmin.from('matches').select('*').eq('id', matchId).single();
  if (!match) return;

  if (!FINISHED_MATCH_STATUSES.includes(match.status)) return;

  const realHome = match.home_goals;
  const realAway = match.away_goals;

  // Se o jogo ainda não começou e não tem placar real (null), não pontuamos
  if (realHome === null || realAway === null) return;


  // 2. Get all predictions for this match
  const { data: predictions } = await supabaseAdmin.from('predictions').select('*').eq('match_id', matchId);
  if (!predictions) return;

  await supabaseAdmin.from('audit_points').delete().eq('match_id', matchId);

  // 3. Process each prediction
  for (const pred of predictions) {
    const pHome = pred.predicted_score_a;
    const pAway = pred.predicted_score_b;

    const scoreResult = calculateMatchScore(
      realHome,
      realAway,
      pHome,
      pAway,
      match.stage as MatchStage
    );

    // Save to audit
    let rule = 'ERRO';
    if (scoreResult.isExact) rule = 'PLACAR_EXATO';
    else if (scoreResult.isWinnerAndGoalDiff) rule = 'VENCEDOR_SALDO';
    else if (scoreResult.isWinnerOnly) rule = 'VENCEDOR_OU_EMPATE';
    else if (scoreResult.isTieOnly) rule = 'EMPATE';
    else if (scoreResult.isSingleTeamGoals) rule = 'GOLS_1_TIME';

    const basePointsRaw = scoreResult.basePoints;

    // Update Prediction
    await supabaseAdmin.from('predictions').update({
      status: 'scored',
      points_earned: scoreResult.points,
      base_points: basePointsRaw,
      multiplier_applied: scoreResult.multiplier
    }).eq('id', pred.id);

    // Add Audit Log
    await supabaseAdmin.from('audit_points').insert({
      user_id: pred.user_id,
      match_id: match.id,
      rule_applied: rule,
      base_points: basePointsRaw,
      multiplier: scoreResult.multiplier,
      final_points: scoreResult.points
    });
  }

  // 4. Update Rankings
  await updateLeaderboard();
}

export async function updateLeaderboard() {
  const { data: scoredPredictions } = await supabaseAdmin
    .from('predictions')
    .select('user_id, points_earned, base_points')
    .eq('status', 'scored');

  if (!scoredPredictions) return;

  const predictionsByUser = new Map<string, typeof scoredPredictions>();
  for (const prediction of scoredPredictions) {
    if (!prediction.user_id) continue;
    const current = predictionsByUser.get(prediction.user_id) || [];
    current.push(prediction);
    predictionsByUser.set(prediction.user_id, current);
  }

  for (const [userId, userPreds] of predictionsByUser) {
    const totalPoints = userPreds.reduce((acc, p) => acc + p.points_earned, 0);
    const exactMatches = userPreds.filter(p => p.base_points === 10).length;
    const correctResults = userPreds.filter(p => p.base_points === 7 || p.base_points === 5).length;

    await supabaseAdmin.from('rankings').upsert({
      user_id: userId,
      total_points: totalPoints,
      exact_matches: exactMatches,
      correct_results: correctResults,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }
}
