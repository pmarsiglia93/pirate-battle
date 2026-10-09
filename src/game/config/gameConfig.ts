export interface MatchOptions {
  sessionTime: number;
  spawnTime: number;
}
export const defaultOptions: MatchOptions = { sessionTime: 120, spawnTime: 4 };
export const gameConfig = {
  world: { width: 1600, height: 900, tile: 64 },
  clock: { dt: 1 / 60, maxSteps: 8, hudInterval: 0.1 },
  limits: { sessionMin: 60, sessionMax: 180, spawnMin: 1.5, spawnMax: 15 },
  player: { hp: 100, speed: 160, turnSpeed: 2.2, radius: 25, x: 800, y: 450 },
  front: { damage: 10, speed: 520, life: 1.1, cooldown: 0.45 },
  broadside: { damage: 8, speed: 520, life: 1.1, cooldown: 1.4, spacing: 18 },
  chaser: { hp: 30, speed: 150, turnSpeed: 1.8, radius: 24, impact: 25 },
  shooter: {
    hp: 40,
    speed: 110,
    turnSpeed: 1.5,
    radius: 25,
    range: 360,
    stopRange: 280,
    cooldown: 1.6,
    damage: 8,
    bulletSpeed: 340,
    bulletLife: 2,
  },
  spawn: { distance: 450, chaserChance: 0.55, attempts: 200 },
  effects: { life: 0.65, flashLife: 0.14, shake: 5 },
  projectileRadius: 5,
} as const;
export function validOptions(value: MatchOptions): boolean {
  return (
    Number.isFinite(value.sessionTime) &&
    Number.isFinite(value.spawnTime) &&
    value.sessionTime >= gameConfig.limits.sessionMin &&
    value.sessionTime <= gameConfig.limits.sessionMax &&
    value.spawnTime >= gameConfig.limits.spawnMin &&
    value.spawnTime <= gameConfig.limits.spawnMax
  );
}
