import { gameConfig, type MatchOptions } from '../config/gameConfig';
import { Rng } from './rng';
import {
  emptyInput,
  type GameState,
  type InputState,
  type WorldContext,
} from './types';
import type { GameEvent } from './events';
import { movePlayer, tickSprint } from '../systems/movement';
import { playerWeapons, tickCooldowns } from '../systems/weapons';
import { projectiles } from '../systems/projectiles';
import { ai } from '../systems/ai';
import { spawn } from '../systems/spawner';
import { finishIfNeeded } from '../systems/match';
export class Simulation implements WorldContext {
  readonly state: GameState;
  input: InputState = emptyInput();
  readonly rng: Rng;
  private id = 1;
  events: GameEvent[] = [];
  nextId = (): number => this.id++;
  emit = (event: GameEvent): void => {
    this.events.push(event);
    if (
      ['fire', 'hit', 'damage', 'explosion', 'splash', 'wreck'].includes(
        event.kind,
      )
    ) {
      const life =
        event.kind === 'wreck'
          ? gameConfig.effects.wreckLife
          : event.kind === 'fire'
            ? gameConfig.effects.flashLife
            : gameConfig.effects.life;
      this.state.effects.push({
        ...event,
        id: this.nextId(),
        life,
        maxLife: life,
      });
    }
  };
  constructor(options: MatchOptions, seed = 42) {
    this.rng = new Rng(seed);
    const p = gameConfig.player;
    this.state = {
      player: {
        id: 0,
        kind: 'player',
        x: p.x,
        y: p.y,
        angle: -Math.PI / 2,
        hp: p.hp,
        maxHp: p.hp,
        radius: p.radius,
        cooldowns: { front: 0, port: 0, starboard: 0 },
      },
      enemies: [],
      projectiles: [],
      effects: [],
      score: 0,
      elapsed: 0,
      status: 'running',
      endReason: null,
      config: { ...options },
      sprint: { active: 0, cooldown: 0 },
      spawnCount: 0,
      nextSpawn: options.spawnTime,
    };
  }
  pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
      this.input = emptyInput();
      this.emit({ kind: 'pause', x: 0, y: 0 });
    }
  }
  resume(): void {
    if (this.state.status === 'paused') {
      this.input = emptyInput();
      this.state.status = 'running';
    }
  }
  step(dt: number): void {
    this.events = [];
    if (this.state.status !== 'running') return;
    this.state.elapsed += dt;
    // A time boundary is terminal before any new combat on that tick.
    finishIfNeeded(this);
    if (this.state.status !== 'running') return;
    for (const effect of this.state.effects) effect.life -= dt;
    this.state.effects = this.state.effects.filter((effect) => effect.life > 0);
    tickCooldowns(this.state.player, dt);
    tickSprint(this.state.sprint, this.input, dt);
    movePlayer(this.state.player, this.input, dt, this.state.sprint.active > 0);
    playerWeapons(this, this.input);
    projectiles(this, dt);
    finishIfNeeded(this);
    if (this.state.status !== 'running') return;
    ai(this, dt);
    finishIfNeeded(this);
    if (this.state.status !== 'running') return;
    this.state.enemies = this.state.enemies.filter((enemy) => enemy.hp > 0);
    if (this.state.elapsed + 1e-9 >= this.state.nextSpawn) {
      spawn(this, this.rng);
      this.state.nextSpawn += this.state.config.spawnTime;
    }
  }
  snapshot(): GameState {
    return structuredClone(this.state);
  }
}
