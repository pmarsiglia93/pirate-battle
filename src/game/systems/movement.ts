import { gameConfig } from '../config/gameConfig';
import type { GameState, InputState, Ship } from '../core/types';
import { blocked } from '../world/arena';
export function move(ship: Ship, speed: number, dt: number): void {
  const x = ship.x + Math.cos(ship.angle) * speed * dt,
    y = ship.y + Math.sin(ship.angle) * speed * dt;
  if (!blocked(x, ship.y, ship.radius)) ship.x = x;
  if (!blocked(ship.x, y, ship.radius)) ship.y = y;
}
export function tickSprint(
  sprint: GameState['sprint'],
  input: InputState,
  dt: number,
): void {
  // Snap float residue to zero so the boost lasts exactly duration / dt ticks.
  sprint.active = sprint.active - dt > 1e-9 ? sprint.active - dt : 0;
  sprint.cooldown = sprint.cooldown - dt > 1e-9 ? sprint.cooldown - dt : 0;
  if (input.sprint && sprint.cooldown <= 1e-9) {
    sprint.active = gameConfig.sprint.duration;
    sprint.cooldown = gameConfig.sprint.cooldown;
  }
}
export function movePlayer(
  ship: Ship,
  input: InputState,
  dt: number,
  sprinting = false,
): void {
  ship.angle +=
    (Number(input.right) - Number(input.left)) *
    gameConfig.player.turnSpeed *
    dt;
  if (input.forward)
    move(
      ship,
      gameConfig.player.speed * (sprinting ? gameConfig.sprint.multiplier : 1),
      dt,
    );
}
