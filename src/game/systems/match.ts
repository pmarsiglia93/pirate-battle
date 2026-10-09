import type { WorldContext } from '../core/types';
export function finishIfNeeded(ctx: WorldContext): void {
  if (
    ctx.state.player.hp > 0 &&
    ctx.state.elapsed + 1e-9 < ctx.state.config.sessionTime
  )
    return;
  ctx.state.status = 'ended';
  ctx.state.endReason = ctx.state.player.hp <= 0 ? 'destroyed' : 'time-up';
  ctx.state.elapsed =
    ctx.state.endReason === 'time-up'
      ? ctx.state.config.sessionTime
      : Math.min(ctx.state.elapsed, ctx.state.config.sessionTime);
  ctx.emit({ kind: 'end', x: ctx.state.player.x, y: ctx.state.player.y });
}
