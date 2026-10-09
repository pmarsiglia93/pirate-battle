import type { MatchOptions } from '../game/config/gameConfig';
import type { EndReason } from '../game/core/types';
export interface MatchRecord {
  matchId: string;
  playerId: string;
  playerName: string;
  createdAt: string;
  score: number;
  durationMs: number;
  endReason: EndReason;
  config: MatchOptions;
  configKey: string;
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export const configKey = (config: MatchOptions): string =>
  `${config.sessionTime}s-${config.spawnTime}s`;
export function compareMatches(a: MatchRecord, b: MatchRecord): number {
  return (
    b.score - a.score ||
    a.durationMs - b.durationMs ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.matchId.localeCompare(b.matchId)
  );
}
