export type Difficulty = 'easy' | 'normal' | 'hard';
export interface MatchOptions {
  sessionTime: number;
  spawnTime: number;
  // Optional so options and records saved before difficulty existed stay valid;
  // a missing value means 'normal'.
  difficulty?: Difficulty;
}
export const defaultOptions: MatchOptions = {
  sessionTime: 120,
  spawnTime: 4,
  difficulty: 'normal',
};
export const gameConfig = {
  world: { width: 1600, height: 900, tile: 64 },
  clock: { dt: 1 / 60, maxSteps: 8, hudInterval: 0.1 },
  limits: { sessionMin: 60, sessionMax: 180, spawnMin: 1.5, spawnMax: 15 },
  player: { hp: 100, speed: 160, turnSpeed: 2.2, radius: 25, x: 800, y: 450 },
  // A burst of speed with its own cooldown, counted from activation.
  sprint: { multiplier: 1.75, duration: 1.5, cooldown: 5 },
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
  effects: { wreckLife: 1.8, life: 0.65, flashLife: 0.14, shake: 5 },
  // Difficulty only scales what enemies do to the player. 'normal' is the
  // challenge's requested balance and must stay at 1.
  difficulty: {
    easy: { label: 'Easy', damageTaken: 0.5, enemySpeed: 0.85 },
    normal: { label: 'Normal', damageTaken: 1, enemySpeed: 1 },
    hard: { label: 'Hard', damageTaken: 1.5, enemySpeed: 1.15 },
  },
  projectileRadius: 5,
  muzzleOffset: 8,
  ai: {
    avoidanceDistances: [35, 70, 110],
    avoidanceAngles: [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, Math.PI],
    fireAngleTolerance: 0.22,
  },
} as const;
export const difficultyOf = (options: MatchOptions): Difficulty =>
  options.difficulty ?? 'normal';
export const damageToPlayer = (base: number, options: MatchOptions): number =>
  Math.round(base * gameConfig.difficulty[difficultyOf(options)].damageTaken);
export const enemySpeedScale = (options: MatchOptions): number =>
  gameConfig.difficulty[difficultyOf(options)].enemySpeed;
export function validOptions(value: MatchOptions): boolean {
  if (!value || typeof value !== 'object') return false;
  return (
    (value.difficulty === undefined ||
      Object.hasOwn(gameConfig.difficulty, value.difficulty)) &&
    Number.isFinite(value.sessionTime) &&
    Number.isFinite(value.spawnTime) &&
    value.sessionTime >= gameConfig.limits.sessionMin &&
    value.sessionTime <= gameConfig.limits.sessionMax &&
    value.spawnTime >= gameConfig.limits.spawnMin &&
    value.spawnTime <= gameConfig.limits.spawnMax
  );
}
