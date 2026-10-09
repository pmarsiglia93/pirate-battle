import { gameConfig } from '../config/gameConfig';
import type { Simulation } from '../core/simulation';
export interface Hud {
  hp: number;
  score: number;
  remaining: number;
  status: string;
  announcement: string;
}
export function createGameStore(simulation: Simulation) {
  let lastTime = -1;
  let value: Hud = {
    hp: 100,
    score: 0,
    remaining: simulation.state.config.sessionTime,
    status: 'running',
    announcement: '',
  };
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => value,
    publish: (force = false) => {
      const s = simulation.state;
      const discrete =
        s.player.hp !== value.hp ||
        s.score !== value.score ||
        s.status !== value.status;
      if (
        !force &&
        !discrete &&
        s.elapsed - lastTime < gameConfig.clock.hudInterval
      )
        return;
      lastTime = s.elapsed;
      const announcement =
        s.status === 'paused'
          ? 'Battle paused.'
          : s.status === 'ended'
            ? 'Battle complete.'
            : s.player.hp <= 30
              ? 'Low health.'
              : s.status !== value.status
                ? 'Battle resumed.'
                : value.announcement;
      value = {
        hp: s.player.hp,
        score: s.score,
        remaining: Math.max(0, Math.ceil(s.config.sessionTime - s.elapsed)),
        status: s.status,
        announcement,
      };
      listeners.forEach((listener) => listener());
    },
  };
}
