export type RoundPhase = 'waiting' | 'drawing' | 'analyzing' | 'result';

export interface RoundResult {
  winnerId: string | null;
  playerResults: Record<string, { matches: boolean; detected_sign: string }>;
  scores: Record<string, number>;
  isReplay: boolean;
}
