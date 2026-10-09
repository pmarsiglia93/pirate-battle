import type { MatchRecord } from '../api/contracts';
import { read, write } from './storage';
export type SubmissionStatus = 'Saving' | 'Saved' | 'Pending' | 'Failed';
let pending = read<MatchRecord[]>('pending', []);
let statuses: Record<string, SubmissionStatus> = Object.fromEntries(
  pending.map((record) => [record.matchId, 'Pending']),
);
const listeners = new Set<() => void>();
export const subscribeSubmissions = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const submissionSnapshot = (): Record<string, SubmissionStatus> =>
  statuses;
export const pendingRecords = (): MatchRecord[] => pending;
export function setSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): void {
  statuses = { ...statuses, [id]: status };
  listeners.forEach((listener) => listener());
}
export function enqueue(record: MatchRecord): void {
  if (!pending.some((item) => item.matchId === record.matchId)) {
    pending = [...pending, record];
    write('pending', pending);
  }
  setSubmissionStatus(record.matchId, 'Saving');
}
export function acknowledge(id: string): void {
  pending = pending.filter((record) => record.matchId !== id);
  write('pending', pending);
  setSubmissionStatus(id, 'Saved');
}
export function resetPending(): void {
  pending = [];
  write('pending', []);
  statuses = {};
  listeners.forEach((listener) => listener());
}
