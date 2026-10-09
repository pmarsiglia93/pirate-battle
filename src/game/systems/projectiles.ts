import { gameConfig } from '../config/gameConfig';
import type { WorldContext } from '../core/types';
import { blocked } from '../world/arena';
import { segmentCircle } from '../world/geometry';
import { damage } from './collision';
export function projectiles(ctx: WorldContext, dt: number): void {
  const survivors = [];
  for (const bullet of ctx.state.projectiles) {
    const x = bullet.x + bullet.vx * dt,
      y = bullet.y + bullet.vy * dt;
    const targets =
      bullet.owner === 'player' ? ctx.state.enemies : [ctx.state.player];
    const hits = targets
      .filter((t) => t.hp > 0)
      .map((target) => ({
        target,
        t: segmentCircle(
          bullet.x,
          bullet.y,
          x,
          y,
          target.x,
          target.y,
          target.radius + gameConfig.projectileRadius,
        ),
      }))
      .filter((hit) => hit.t !== null)
      .sort((a, b) => a.t! - b.t!);
    // Subsample the swept segment so tiles cannot be skipped even at high speed.
    const steps = Math.max(
      1,
      Math.ceil(
        Math.hypot(x - bullet.x, y - bullet.y) / gameConfig.projectileRadius,
      ),
    );
    let wall = Infinity;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (
        blocked(
          bullet.x + (x - bullet.x) * t,
          bullet.y + (y - bullet.y) * t,
          gameConfig.projectileRadius,
        )
      ) {
        wall = t;
        break;
      }
    }
    const hit = hits[0];
    if (hit && hit.t !== null && hit.t < wall) {
      damage(ctx, hit.target, bullet.damage, bullet.owner === 'player');
      continue;
    }
    bullet.x = x;
    bullet.y = y;
    bullet.life -= dt;
    if (wall !== Infinity || bullet.life <= 1e-9) {
      ctx.emit({ kind: 'splash', x, y });
      continue;
    }
    survivors.push(bullet);
  }
  ctx.state.projectiles = survivors;
}
