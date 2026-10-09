import { gameConfig } from '../config/gameConfig';
import type { InputState, Ship } from '../core/types';
import { blocked } from '../world/arena';
export function move(ship: Ship, speed: number, dt: number): void {
  const x = ship.x + Math.cos(ship.angle) * speed * dt,
    y = ship.y + Math.sin(ship.angle) * speed * dt;
  if (!blocked(x, ship.y, ship.radius)) ship.x = x;
  if (!blocked(ship.x, y, ship.radius)) ship.y = y;
}
export function movePlayer(ship: Ship, input: InputState, dt: number): void {
  ship.angle +=
    (Number(input.right) - Number(input.left)) *
    gameConfig.player.turnSpeed *
    dt;
  if (input.forward) move(ship, gameConfig.player.speed, dt);
}
