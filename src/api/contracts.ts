import { difficultyOf, type MatchOptions } from '../game/config/gameConfig';
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
// 'normal' keeps the original key so records saved before difficulty existed
// still rank together with new normal matches.
export const configKey = (config: MatchOptions): string => {
  const difficulty = difficultyOf(config);
  return `${config.sessionTime}s-${config.spawnTime}s${difficulty === 'normal' ? '' : `-${difficulty}`}`;
};
export function configLabel(key: string): string {
  const [session = '', spawn = '', difficulty] = key.split('-');
  return `${session.replace(/s$/, '')} seconds · ${spawn} spawn${difficulty ? ` · ${difficulty}` : ''}`;
}
export function compareMatches(a: MatchRecord, b: MatchRecord): number {
  return (
    b.score - a.score ||
    a.durationMs - b.durationMs ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.matchId.localeCompare(b.matchId)
  );
}
