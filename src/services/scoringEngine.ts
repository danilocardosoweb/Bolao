import { calculateMatchScore, MatchStage } from "../lib/scoring";
import { supabaseAdmin } from "../lib/supabase-admin";

export async function calculateMatchPoints(matchId: string) {
  // 1. Get the match result
  const { data: match } = await supabaseAdmin.from('matches').select('*').eq('id', matchId).single();
  if (!match) return;

  const realHome = match.home_goals;
  const realAway = match.away_goals;

  // Se o jogo ainda não começou e não tem placar real (null), não pontuamos
  if (realHome === null || realAway === null) return;


  // 2. Get all predictions for this match
  const { data: predictions } = await supabaseAdmin.from('predictions').select('*').eq('match_id', matchId);
  if (!predictions) return;

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

    const basePointsRaw = scoreResult.points / scoreResult.multiplier;

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
  const { data: users } = await supabaseAdmin.from('users').select('id');
  if (!users) return;

  for (const user of users) {
    // Collect stats from predictions
    const { data: userPreds } = await supabaseAdmin.from('predictions')
      .select('points_earned, base_points')
      .eq('user_id', user.id)
      .eq('status', 'scored');

    if (!userPreds) continue;

    const totalPoints = userPreds.reduce((acc, p) => acc + p.points_earned, 0);
    // Real implementation would track exact matches (base=10), correct results, ties, etc.
    const exactMatches = userPreds.filter(p => p.base_points === 10).length;
    const correctResults = userPreds.filter(p => p.base_points === 7).length;

    await supabaseAdmin.from('rankings').upsert({
      user_id: user.id,
      total_points: totalPoints,
      exact_matches: exactMatches,
      correct_results: correctResults,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }); // adjust based on group vs global
  }
}
