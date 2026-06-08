export type MatchStage = 'group_stage' | 'round_of_32' | 'round_of_16' | 'quarter_finals' | 'semi_finals' | 'third_place' | 'final';
export type PredictionStatus = 'pending' | 'locked' | 'scored';

export interface User {
  id: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  city?: string;
  favoriteTeam?: string;
}

export interface Match {
  id: string;
  apiFixtureId?: number;
  teamACode: string;
  teamBCode: string;
  teamAName: string;
  teamBName: string;
  teamAFlag: string;
  teamBFlag: string;
  matchDate: string;
  stadium: string;
  city: string;
  stage: MatchStage;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  isFinished: boolean; // Computed from status === 'FT'
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  predictedScoreA: number | null;
  predictedScoreB: number | null;
  pointsEarned: number;
  status: PredictionStatus;
}

export interface RankingEntry {
  userId: string;
  user: User;
  totalPoints: number;
  exactMatches: number;
  correctResults: number;
  ties?: number;
  errors?: number;
  position: number;
  previousPosition: number;
}
