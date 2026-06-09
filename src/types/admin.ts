export type AdminParticipantSummary = {
  userId: string;
  email: string;
  displayName: string;
  totalPredictions: number;
  completedPredictions: number;
  pendingPredictions: number;
  scoredPredictions: number;
  totalPoints: number;
  exactMatches: number;
  correctResults: number;
  completionRate: number;
  lastPredictionAt: string | null;
  createdAt: string | null;
};

export type AdminPredictionRecord = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  predictedScoreA: number | null;
  predictedScoreB: number | null;
  pointsEarned: number;
  basePoints: number;
  multiplierApplied: number;
  predictionStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
  matchId: string;
  matchDate: string | null;
  matchStatus: string | null;
  stage: string | null;
  groupName: string | null;
  stadium: string | null;
  city: string | null;
  teamAName: string | null;
  teamACode: string | null;
  teamBName: string | null;
  teamBCode: string | null;
  officialScoreA: number | null;
  officialScoreB: number | null;
};

export type AdminMatchCoverage = {
  matchId: string;
  matchDate: string | null;
  matchStatus: string | null;
  stage: string | null;
  groupName: string | null;
  stadium: string | null;
  city: string | null;
  teamAName: string | null;
  teamACode: string | null;
  teamBName: string | null;
  teamBCode: string | null;
  predictionCount: number;
  scoredPredictionCount: number;
  missingParticipants: number;
  coverageRate: number;
};

export type AdminPredictionSummary = {
  participants: number;
  matches: number;
  predictions: number;
  averageCompletionRate: number;
  matchesWithoutPredictions: number;
  lastPredictionAt: string | null;
};

export type AdminPredictionsReport = {
  summary: AdminPredictionSummary;
  participants: AdminParticipantSummary[];
  predictions: AdminPredictionRecord[];
  coverage: AdminMatchCoverage[];
  generatedAt: string;
};
