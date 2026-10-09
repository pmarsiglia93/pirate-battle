import { gameConfig } from '../config/gameConfig';
import type { Rng } from '../core/rng';
import type { WorldContext } from '../core/types';
import { blocked } from '../world/arena';
import { distance } from '../world/geometry';
export function spawn(ctx: WorldContext, rng: Rng): void {
  const kind =
    ctx.state.spawnCount === 0
      ? 'chaser'
      : ctx.state.spawnCount === 1
        ? 'shooter'
        : rng.next() < gameConfig.spawn.chaserChance
          ? 'chaser'
          : 'shooter';
  const config = gameConfig[kind];
  for (let attempt = 0; attempt < gameConfig.spawn.attempts; attempt++) {
    const x =
        config.radius +
        rng.next() * (gameConfig.world.width - 2 * config.radius),
      y =
        config.radius +
        rng.next() * (gameConfig.world.height - 2 * config.radius);
    if (
      blocked(x, y, config.radius) ||
      distance({ x, y }, ctx.state.player) < gameConfig.spawn.distance ||
      ctx.state.enemies.some(
        (e) => distance({ x, y }, e) < config.radius + e.radius,
      )
    )
      continue;
    ctx.state.enemies.push({
      id: ctx.nextId(),
      kind,
      x,
      y,
      angle: Math.atan2(ctx.state.player.y - y, ctx.state.player.x - x),
      hp: config.hp,
      maxHp: config.hp,
      radius: config.radius,
      cooldowns: { front: 0, port: 0, starboard: 0 },
    });
    ctx.state.spawnCount++;
    return;
  }
}
