import type { MatchRecord } from '../api/contracts';
import { read, write } from './storage';
export const loadLastResult = (): MatchRecord | null =>
  read<MatchRecord | null>('lastResult', null);
export const saveLastResult = (record: MatchRecord): void =>
  write('lastResult', record);
export function playerId(): string {
  let id = read<string | null>('playerId', null);
  if (!id) {
    id = crypto.randomUUID();
    write('playerId', id);
  }
  return id;
}
