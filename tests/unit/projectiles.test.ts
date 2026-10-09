import { describe, expect, it } from 'vitest';
import { Simulation } from '../../src/game/core/simulation';
import { defaultOptions } from '../../src/game/config/gameConfig';
import type { Ship } from '../../src/game/core/types';
import { fire } from '../../src/game/systems/weapons';
import { projectiles } from '../../src/game/systems/projectiles';
const target = (id: number, x: number, y: number, hp = 30): Ship => ({
  id,
  kind: 'chaser',
  x,
  y,
  angle: 0,
  hp,
  maxHp: 30,
  radius: 24,
  cooldowns: { front: 0, port: 0, starboard: 0 },
});
describe('swept projectile collisions', () => {
  it('hits the closest ship exactly once even across a long step', () => {
    const sim = new Simulation(defaultOptions);
    sim.state.enemies = [target(1, 800, 320), target(2, 800, 220)];
    fire(sim, sim.state.player, 'front');
    projectiles(sim, 0.5);
    expect(sim.state.enemies[0]!.hp).toBe(20);
    expect(sim.state.enemies[1]!.hp).toBe(30);
    expect(sim.state.projectiles).toHaveLength(0);
    projectiles(sim, 0.5);
    expect(sim.state.enemies[0]!.hp).toBe(20);
  });
  it('prevents friendly fire and stops on an island', () => {
    const sim = new Simulation(defaultOptions);
    sim.state.player.x = 560;
    sim.state.player.y = 250;
    sim.state.player.angle = Math.PI;
    sim.state.enemies = [target(1, 450, 250)];
    fire(sim, sim.state.player, 'front');
    projectiles(sim, 0.4);
    expect(sim.state.enemies[0]!.hp).toBe(30);
    expect(sim.state.player.hp).toBe(100);
    expect(sim.state.projectiles).toHaveLength(0);
  });
  it('simultaneous lethal shots award only one point', () => {
    const sim = new Simulation(defaultOptions);
    sim.state.enemies = [target(1, 800, 350, 8)];
    fire(sim, sim.state.player, 'front');
    sim.state.player.cooldowns.front = 0;
    fire(sim, sim.state.player, 'front');
    projectiles(sim, 0.4);
    expect(sim.state.score).toBe(1);
  });
});
