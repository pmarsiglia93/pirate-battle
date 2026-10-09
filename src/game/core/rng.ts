export class Rng {
  constructor(private seed: number) {
    this.seed = seed >>> 0;
  }
  next(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  setSeed(seed: number): void {
    this.seed = seed >>> 0;
  }
}
