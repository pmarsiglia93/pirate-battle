import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../src/game/core/clock';
import { Rng } from '../../src/game/core/rng';
describe('deterministic time', () => {
  it('caps stalled frames and resets fractional input', () => {
    let steps = 0;
    const clock = new FixedClock(() => steps++);
    clock.frame(5000);
    expect(steps).toBe(8);
    clock.frame(5);
    clock.reset();
    clock.frame(12);
    expect(steps).toBe(8);
  });
  it('advances exactly one minute with manual time', () => {
    let steps = 0;
    new FixedClock(() => steps++).advance(60000);
    expect(steps).toBe(3600);
  });
  it('replays seeded randomness', () => {
    const a = new Rng(42),
      b = new Rng(42);
    expect(Array.from({ length: 50 }, () => a.next())).toEqual(
      Array.from({ length: 50 }, () => b.next()),
    );
  });
});
