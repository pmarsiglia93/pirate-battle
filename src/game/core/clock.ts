import { gameConfig } from '../config/gameConfig';
export class FixedClock {
  private accumulator = 0;
  constructor(private step: (dt: number) => void) {}
  reset(): void {
    this.accumulator = 0;
  }
  frame(ms: number): void {
    this.accumulator += Math.min(
      Math.max(ms, 0) / 1000,
      gameConfig.clock.dt * gameConfig.clock.maxSteps,
    );
    let steps = 0;
    while (
      this.accumulator + 1e-10 >= gameConfig.clock.dt &&
      steps++ < gameConfig.clock.maxSteps
    ) {
      this.accumulator -= gameConfig.clock.dt;
      this.step(gameConfig.clock.dt);
    }
  }
  advance(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0 || ms > 600000)
      throw new Error('Advance must be between 0 and 600000 ms');
    let remaining = ms;
    while (remaining > 0) {
      const slice = Math.min(remaining, 1000 / 60);
      this.frame(slice);
      remaining -= slice;
    }
  }
}
