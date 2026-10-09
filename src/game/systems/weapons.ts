import { gameConfig } from '../config/gameConfig';
import type { InputState, Ship, WorldContext } from '../core/types';
export function tickCooldowns(ship: Ship, dt: number): void {
  for (const key of ['front', 'port', 'starboard'] as const)
    ship.cooldowns[key] = Math.max(0, ship.cooldowns[key] - dt);
}
export function fire(
  ctx: WorldContext,
  ship: Ship,
  side: 'front' | 'port' | 'starboard',
): void {
  if (ship.hp <= 0 || ship.cooldowns[side] > 1e-9) return;
  const enemy = ship.kind !== 'player',
    broad = side !== 'front';
  const config = enemy
    ? gameConfig.shooter
    : broad
      ? gameConfig.broadside
      : gameConfig.front;
  const angle =
    ship.angle +
    (side === 'port' ? -Math.PI / 2 : side === 'starboard' ? Math.PI / 2 : 0);
  const speed = 'bulletSpeed' in config ? config.bulletSpeed : config.speed;
  const life = 'bulletLife' in config ? config.bulletLife : config.life;
  ship.cooldowns[side] = config.cooldown;
  for (const offset of broad
    ? [-gameConfig.broadside.spacing, 0, gameConfig.broadside.spacing]
    : [0]) {
    const x =
        ship.x +
        Math.cos(angle) * (ship.radius + 8) +
        Math.cos(ship.angle) * offset,
      y =
        ship.y +
        Math.sin(angle) * (ship.radius + 8) +
        Math.sin(ship.angle) * offset;
    ctx.state.projectiles.push({
      id: ctx.nextId(),
      owner: enemy ? 'enemy' : 'player',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: config.damage,
      life,
    });
    ctx.emit({ kind: 'fire', x, y });
  }
}
export function playerWeapons(ctx: WorldContext, input: InputState): void {
  if (input.front) fire(ctx, ctx.state.player, 'front');
  if (input.port) fire(ctx, ctx.state.player, 'port');
  if (input.starboard) fire(ctx, ctx.state.player, 'starboard');
}
