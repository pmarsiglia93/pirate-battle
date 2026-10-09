import { read, write } from '../persistence/storage';
import { Rng } from '../game/core/rng';
export const scenarios = [
  'success',
  'empty',
  'many-pages',
  'slow',
  'variable-latency',
  'out-of-order',
  'timeout',
  'network-error',
  'http-4xx',
  'http-5xx',
  'ranking-fails',
  'history-fails',
  'register-timeout-after-commit',
  'offline-then-recover',
] as const;
export type Scenario = (typeof scenarios)[number];
const param = new URLSearchParams(location.search).get('scenario');
let current: Scenario = scenarios.includes(param as Scenario)
  ? (param as Scenario)
  : read<Scenario>('scenario', 'success');
let rng = new Rng(
  Number(new URLSearchParams(location.search).get('seed') ?? 42),
);
export const getScenario = (): Scenario => current;
export function setScenario(value: Scenario): void {
  current = value;
  rng = new Rng(42);
  write('scenario', value);
  write('offlineAttempts', 0);
}
export const latency = (page: number): number =>
  current === 'slow'
    ? 1200
    : current === 'variable-latency'
      ? 100 + Math.floor(rng.next() * 1100)
      : current === 'out-of-order'
        ? page === 1
          ? 1200
          : 100
        : 80;
