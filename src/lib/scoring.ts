export type MatchStage = 
  | 'group_stage' 
  | 'round_of_32' 
  | 'round_of_16' 
  | 'quarter_finals' 
  | 'semi_finals' 
  | 'third_place' 
  | 'final';

export interface ScoreResult {
  points: number;
  isExact: boolean;
  isWinnerAndGoalDiff: boolean;
  isWinnerOnly: boolean;
  isTieOnly: boolean;
  isSingleTeamGoals: boolean;
  isWrong: boolean;
  multiplier: number;
}

export function getStageMultiplier(stage: MatchStage): number {
  switch (stage) {
    case 'group_stage': return 1;
    case 'round_of_32': return 1.2;
    case 'round_of_16': return 1.5;
    case 'quarter_finals': return 2;
    case 'semi_finals': return 2.5;
    case 'third_place': return 2.5; // Assuming same as semi
    case 'final': return 3;
    default: return 1;
  }
}

/**
 * Calculates the score for a prediction based on real match results.
 */
export function calculateMatchScore(
  resultA: number,
  resultB: number,
  predA: number,
  predB: number,
  stage: MatchStage = 'group_stage'
): ScoreResult {
  const multiplier = getStageMultiplier(stage);
  
  let basePoints = 0;
  let isExact = false;
  let isWinnerAndGoalDiff = false;
  let isWinnerOnly = false;
  let isTieOnly = false;
  let isSingleTeamGoals = false;
  let isWrong = false;

  const resultDiff = resultA - resultB;
  const predDiff = predA - predB;

  const resultWinner = resultDiff > 0 ? 'A' : resultDiff < 0 ? 'B' : 'TIE';
  const predWinner = predDiff > 0 ? 'A' : predDiff < 0 ? 'B' : 'TIE';

  if (resultA === predA && resultB === predB) {
    // 1. PLACAR EXATO
    basePoints = 10;
    isExact = true;
  } else if (resultWinner === predWinner && resultWinner !== 'TIE' && resultDiff === predDiff) {
    // 2. ACERTOU VENCEDOR E SALDO DE GOLS (não pode ser empate, pois placar exato cobre empates perfeitos)
    basePoints = 7;
    isWinnerAndGoalDiff = true;
  } else if (resultWinner === predWinner && resultWinner !== 'TIE') {
    // 3. ACERTOU APENAS O VENCEDOR
    basePoints = 5;
    isWinnerOnly = true;
  } else if (resultWinner === 'TIE' && predWinner === 'TIE') {
    // 4. ACERTOU EMPATE (mas não o placar exato)
    basePoints = 5;
    isTieOnly = true;
  } else if (resultA === predA || resultB === predB) {
    // 5. ACERTOU OS GOLS DE APENAS UM DOS TIMES
    basePoints = 2;
    isSingleTeamGoals = true;
  } else {
    // 6. ERROU TUDO
    basePoints = 0;
    isWrong = true;
  }

  return {
    points: Math.round(basePoints * multiplier), // Assuming we round or keep decimal. Let's round or just multiply.
    isExact,
    isWinnerAndGoalDiff,
    isWinnerOnly,
    isTieOnly,
    isSingleTeamGoals,
    isWrong,
    multiplier
  };
}

// Special Predictions Points Config
export const SPECIAL_PREDICTIONS_POINTS = {
  CHAMPION: 30,
  RUNNER_UP: 20,
  TOP_SCORER: 15,
  BEST_PLAYER: 15,
};

// Achievements Points Config
export const ACHIEVEMENTS_POINTS = {
  CAPTAIN_OF_ROUND: 5,
  PERFECT_ROUND_GROUP: 15,
  PERFECT_ROUND_KNOCKOUT: 25,
  SEER: 10,        // Vidente (5 placares exatos seguidos)
  KING_OF_SCORE: 20, // Rei do Placar (10 acumulados)
  TIE_SPECIALIST: 10 // Especialista em Empates (5 empates acumulados)
};
