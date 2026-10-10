import { damageToPlayer, gameConfig } from '../config/gameConfig';
import type { Ship, WorldContext } from '../core/types';
export function damage(
  ctx: WorldContext,
  target: Ship,
  amount: number,
  byPlayer: boolean,
): void {
  if (target.hp <= 0 || ctx.state.status !== 'running') return;
  target.hp = Math.max(0, target.hp - amount);
  ctx.emit({
    kind: target.kind === 'player' ? 'damage' : 'hit',
    x: target.x,
    y: target.y,
  });
  if (target.hp === 0) {
    ctx.emit({
      kind: 'wreck',
      x: target.x,
      y: target.y,
      angle: target.angle,
      sprite:
        target.kind === 'player' ? 20 : target.kind === 'chaser' ? 21 : 23,
    });
    ctx.emit({ kind: 'explosion', x: target.x, y: target.y });
    if (byPlayer && target.kind !== 'player') {
      ctx.state.score++;
      ctx.emit({ kind: 'score', x: target.x, y: target.y });
    }
  }
}
export function ram(ctx: WorldContext, enemy: Ship): void {
  if (enemy.hp <= 0 || ctx.state.player.hp <= 0) return;
  enemy.hp = 0;
  ctx.emit({
    kind: 'wreck',
    x: enemy.x,
    y: enemy.y,
    angle: enemy.angle,
    sprite: 21,
  });
  ctx.emit({ kind: 'explosion', x: enemy.x, y: enemy.y });
  damage(
    ctx,
    ctx.state.player,
    damageToPlayer(gameConfig.chaser.impact, ctx.state.config),
    false,
  );
}
