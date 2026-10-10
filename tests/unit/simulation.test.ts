import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/game/core/simulation';
import {
  defaultOptions,
  gameConfig,
  validOptions,
  type MatchOptions,
} from '../../src/game/config/gameConfig';
import { configKey } from '../../src/api/contracts';
import type { Ship } from '../../src/game/core/types';
import { resolveSeed } from '../../src/game/core/testApi';
import { validName, validShip } from '../../src/persistence/profile';
import { blocked } from '../../src/game/world/arena';
import { damage, ram } from '../../src/game/systems/collision';
import { fire } from '../../src/game/systems/weapons';
import { FixedClock } from '../../src/game/core/clock';
const advance = (sim: Simulation, ms: number) =>
  new FixedClock((dt) => sim.step(dt)).advance(ms);
describe('combat invariants', () => {
  it('replays the same inputs and seed', () => {
    const a = new Simulation(defaultOptions, 5),
      b = new Simulation(defaultOptions, 5);
    a.input.forward = b.input.forward = true;
    a.input.front = b.input.front = true;
    advance(a, 10000);
    advance(b, 10000);
    expect(a.snapshot()).toEqual(b.snapshot());
  });
  it('slides along islands and never escapes the visible world', () => {
    const sim = new Simulation(defaultOptions);
    sim.state.player.x = 550;
    sim.state.player.y = 200;
    sim.state.player.angle = -Math.PI + 0.3;
    sim.input.forward = true;
    advance(sim, 2000);
    expect(
      blocked(sim.state.player.x, sim.state.player.y, sim.state.player.radius),
    ).toBe(false);
    expect(sim.state.player.y).toBeLessThan(200);
    sim.state.player.x = 800;
    sim.state.player.y = 40;
    sim.state.player.angle = -Math.PI / 2;
    advance(sim, 2000);
    expect(sim.state.player.y).toBeGreaterThanOrEqual(25);
  });
  it('produces parallel broadsides with independent cooldowns', () => {
    const sim = new Simulation(defaultOptions);
    fire(sim, sim.state.player, 'port');
    fire(sim, sim.state.player, 'port');
    fire(sim, sim.state.player, 'starboard');
    expect(sim.state.projectiles).toHaveLength(6);
    expect(
      new Set(sim.state.projectiles.slice(0, 3).map((b) => b.vx)).size,
    ).toBe(1);
  });
  it('guarantees both enemies and valid spawn spacing', () => {
    const sim = new Simulation(defaultOptions);
    advance(sim, 4000);
    expect(sim.state.enemies[0]?.kind).toBe('chaser');
    expect(
      Math.hypot(sim.state.enemies[0]!.x - 800, sim.state.enemies[0]!.y - 450),
    ).toBeGreaterThanOrEqual(450);
    advance(sim, 4000);
    expect(sim.state.enemies.some((e) => e.kind === 'shooter')).toBe(true);
  });
  it('does not double score destroyed enemies', () => {
    const sim = new Simulation(defaultOptions);
    advance(sim, 4000);
    const target = sim.state.enemies[0]!;
    damage(sim, target, 100, true);
    damage(sim, target, 100, true);
    expect(sim.state.score).toBe(1);
  });
  it('clears input on pause and freezes every field', () => {
    const sim = new Simulation(defaultOptions);
    sim.input.front = true;
    sim.pause();
    const before = sim.snapshot();
    advance(sim, 10000);
    expect(sim.snapshot()).toEqual(before);
    sim.resume();
    expect(sim.input.front).toBe(false);
  });
  it('ends by death and freezes the entire world', () => {
    const sim = new Simulation(defaultOptions);
    advance(sim, 120000);
    expect(sim.state.status).toBe('ended');
    expect(sim.state.endReason).toBe('destroyed');
    const before = sim.snapshot();
    advance(sim, 10000);
    expect(sim.snapshot()).toEqual(before);
  });
  it('ends exactly on time without a final spawn or shot', () => {
    const sim = new Simulation({ sessionTime: 60, spawnTime: 15 });
    sim.state.nextSpawn = 1000;
    sim.input.front = true;
    advance(sim, 60000);
    expect(sim.state.endReason).toBe('time-up');
    expect(sim.state.elapsed).toBe(60);
    const before = sim.snapshot();
    advance(sim, 10000);
    expect(sim.snapshot()).toEqual(before);
  });
  it('copies options and restarts cleanly', () => {
    const options = { ...defaultOptions };
    const sim = new Simulation(options);
    options.spawnTime = 1.5;
    advance(sim, 4000);
    const next = new Simulation(defaultOptions);
    expect(sim.state.config.spawnTime).toBe(4);
    expect(next.state.player.hp).toBe(gameConfig.player.hp);
    expect(next.state.enemies).toHaveLength(0);
  });
});
describe('difficulty', () => {
  const enemy = (kind: 'chaser' | 'shooter'): Ship => ({
    id: 99,
    kind,
    x: 100,
    y: 100,
    angle: 0,
    hp: 40,
    maxHp: 40,
    radius: 25,
    cooldowns: { front: 0, port: 0, starboard: 0 },
  });
  it.each([
    ['easy', 13, 4],
    ['normal', 25, 8],
    ['hard', 38, 12],
  ] as const)(
    '%s scales Chaser impact and Shooter shots',
    (difficulty, impact, shot) => {
      const sim = new Simulation({ ...defaultOptions, difficulty });
      ram(sim, enemy('chaser'));
      expect(sim.state.player.hp).toBe(gameConfig.player.hp - impact);
      fire(sim, enemy('shooter'), 'front');
      expect(sim.state.projectiles.at(-1)!.damage).toBe(shot);
    },
  );
  it('never changes the player weapons', () => {
    for (const difficulty of ['easy', 'hard'] as const) {
      const sim = new Simulation({ ...defaultOptions, difficulty });
      fire(sim, sim.state.player, 'front');
      expect(sim.state.projectiles[0]!.damage).toBe(gameConfig.front.damage);
    }
  });
  it('treats a missing difficulty as normal and keeps its ranking key', () => {
    const legacy: MatchOptions = { sessionTime: 120, spawnTime: 4 };
    expect(validOptions(legacy)).toBe(true);
    expect(configKey(legacy)).toBe('120s-4s');
    expect(configKey({ ...legacy, difficulty: 'normal' })).toBe('120s-4s');
    expect(configKey({ ...legacy, difficulty: 'easy' })).toBe('120s-4s-easy');
    expect(validOptions({ ...legacy, difficulty: 'insane' as never })).toBe(
      false,
    );
    const sim = new Simulation(legacy);
    ram(sim, enemy('chaser'));
    expect(sim.state.player.hp).toBe(75);
  });
});
describe('sprint', () => {
  // Sail east along the open top lane so no island or border cuts the run short.
  const startX = 200;
  const sail = (sprint: boolean, ms: number) => {
    const sim = new Simulation({ sessionTime: 60, spawnTime: 15 });
    Object.assign(sim.state.player, { x: startX, y: 70, angle: 0 });
    sim.input.forward = true;
    sim.input.sprint = sprint;
    advance(sim, ms);
    return sim;
  };
  it('boosts speed only for its duration', () => {
    const { duration, multiplier } = gameConfig.sprint;
    const normal = sail(false, 1000).state.player.x - startX;
    const boosted = sail(true, 1000).state.player.x - startX;
    expect(normal).toBeCloseTo(gameConfig.player.speed, 5);
    expect(boosted).toBeCloseTo(normal * multiplier, 5);
    // Held for 3 s: boosted for the duration, normal speed for the rest.
    const held = sail(true, 3000).state.player.x - startX;
    expect(held).toBeCloseTo(
      gameConfig.player.speed * (duration * multiplier + (3 - duration)),
      5,
    );
  });
  it('cannot be used again before its cooldown and recharges after it', () => {
    const sim = sail(true, 100);
    expect(sim.state.sprint.active).toBeGreaterThan(0);
    advance(sim, 3000);
    expect(sim.state.sprint.active).toBe(0);
    expect(sim.state.sprint.cooldown).toBeGreaterThan(0);
    advance(sim, 2000);
    expect(sim.state.sprint.active).toBeGreaterThan(0);
  });
  it('does not recharge while paused', () => {
    const sim = sail(true, 100);
    sim.pause();
    const before = sim.snapshot().sprint;
    advance(sim, 10000);
    expect(sim.state.sprint).toEqual(before);
  });
});
describe('match seed and captain profile', () => {
  const random = () => 987654;
  it('is random for players, fixed for tests and replayable on request', () => {
    expect(resolveSeed(new URLSearchParams(''), random)).toBe(987654);
    expect(resolveSeed(new URLSearchParams('test=1'), random)).toBe(42);
    expect(resolveSeed(new URLSearchParams('seed=7'), random)).toBe(7);
    expect(resolveSeed(new URLSearchParams('test=1&seed=7'), random)).toBe(7);
    expect(resolveSeed(new URLSearchParams('seed=abc'), random)).toBe(987654);
  });
  it('different seeds spawn enemies in different places', () => {
    const first = (seed: number) => {
      const sim = new Simulation(defaultOptions, seed);
      advance(sim, 4100);
      return sim.state.enemies[0]!;
    };
    const a = first(1),
      b = first(2);
    expect([a.x, a.y]).not.toEqual([b.x, b.y]);
  });
  it('validates names and ships', () => {
    expect(validName('Bo')).toBe(false);
    expect(validName('   Bo   ')).toBe(false);
    expect(validName('Anne Bonny')).toBe(true);
    expect(validName('x'.repeat(17))).toBe(false);
    expect(validShip(4)).toBe(true);
    expect(validShip(3)).toBe(false);
  });
});
