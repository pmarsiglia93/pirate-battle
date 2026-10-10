import { enemySpeedScale, gameConfig } from '../config/gameConfig';
import type { WorldContext } from '../core/types';
import { blocked } from '../world/arena';
import { angleDelta, distance, turnToward } from '../world/geometry';
import { move } from './movement';
import { ram } from './collision';
import { fire, tickCooldowns } from './weapons';
export function ai(ctx: WorldContext, dt: number): void {
  for (const enemy of ctx.state.enemies) {
    if (enemy.hp <= 0 || ctx.state.player.hp <= 0) continue;
    const config =
        enemy.kind === 'chaser' ? gameConfig.chaser : gameConfig.shooter,
      player = ctx.state.player;
    tickCooldowns(enemy, dt);
    let target = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    // Test candidate headings across a 110 px feeler, choosing the least deviation.
    for (const offset of gameConfig.ai.avoidanceAngles) {
      const heading = target + offset;
      if (
        gameConfig.ai.avoidanceDistances.every(
          (length) =>
            !blocked(
              enemy.x + Math.cos(heading) * length,
              enemy.y + Math.sin(heading) * length,
              enemy.radius,
            ),
        )
      ) {
        target = heading;
        break;
      }
    }
    enemy.angle = turnToward(enemy.angle, target, config.turnSpeed * dt);
    const range = distance(enemy, player);
    if (enemy.kind === 'chaser' || range > gameConfig.shooter.stopRange)
      move(enemy, config.speed * enemySpeedScale(ctx.state.config), dt);
    if (
      enemy.kind === 'chaser' &&
      distance(enemy, player) < enemy.radius + player.radius
    )
      ram(ctx, enemy);
    if (
      enemy.kind === 'shooter' &&
      range <= gameConfig.shooter.range &&
      Math.abs(
        angleDelta(
          enemy.angle,
          Math.atan2(player.y - enemy.y, player.x - enemy.x),
        ),
      ) < gameConfig.ai.fireAngleTolerance
    )
      fire(ctx, enemy, 'front');
  }
}
