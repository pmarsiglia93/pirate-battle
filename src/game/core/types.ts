import type { MatchOptions } from '../config/gameConfig';
import type { Effect, GameEvent } from './events';
export interface InputState {
  forward: boolean;
  left: boolean;
  right: boolean;
  front: boolean;
  port: boolean;
  starboard: boolean;
  sprint: boolean;
}
export const emptyInput = (): InputState => ({
  forward: false,
  left: false,
  right: false,
  front: false,
  port: false,
  starboard: false,
  sprint: false,
});
export type ShipKind = 'player' | 'chaser' | 'shooter';
export interface Ship {
  id: number;
  kind: ShipKind;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  radius: number;
  cooldowns: { front: number; port: number; starboard: number };
}
export interface Projectile {
  id: number;
  owner: 'player' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
}
export type MatchStatus = 'running' | 'paused' | 'ended';
export type EndReason = 'time-up' | 'destroyed';
export interface GameState {
  player: Ship;
  enemies: Ship[];
  projectiles: Projectile[];
  effects: Effect[];
  score: number;
  elapsed: number;
  status: MatchStatus;
  endReason: EndReason | null;
  config: MatchOptions;
  // Seconds of boost left and seconds until the next sprint is available.
  sprint: { active: number; cooldown: number };
  spawnCount: number;
  nextSpawn: number;
}
export interface WorldContext {
  state: GameState;
  nextId: () => number;
  emit: (event: GameEvent) => void;
}
