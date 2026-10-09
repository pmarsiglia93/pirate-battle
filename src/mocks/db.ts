import { read, write } from '../persistence/storage';
import { playerId } from '../persistence/lastResult';
import type { MatchRecord } from '../api/contracts';
import { fixtures } from './fixtures';
import { getScenario } from './scenarios';
export function records(): MatchRecord[] {
  const existing = read<MatchRecord[] | null>('db', null);
  if (existing) return existing;
  const initial =
    getScenario() === 'many-pages'
      ? fixtures(75, playerId())
      : getScenario() === 'empty'
        ? []
        : fixtures();
  write('db', initial);
  return initial;
}
export function putRecord(record: MatchRecord): {
  record: MatchRecord;
  created: boolean;
} {
  const all = records(),
    existing = all.find((item) => item.matchId === record.matchId);
  if (existing) return { record: existing, created: false };
  write('db', [...all, record]);
  return { record, created: true };
}
export function resetDb(): void {
  write(
    'db',
    getScenario() === 'many-pages'
      ? fixtures(75, playerId())
      : getScenario() === 'empty'
        ? []
        : fixtures(),
  );
  write('offlineAttempts', 0);
}
