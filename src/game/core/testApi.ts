import type { GameState } from './types';
export interface PirateTestApi {
  advance: (ms: number) => void;
  getState: () => GameState;
  setSeed: (seed: number) => void;
  getResources: () => { displayObjects: number; pooledSprites: number };
}
declare global {
  interface Window {
    __PIRATE_TEST__?: PirateTestApi;
    __PIRATE_RESOURCES__?: () => {
      applications: number;
      displayObjects: number;
      cachedTextures: number;
      sharedTextureListeners: number;
    };
  }
}
// Tests need a fixed seed to be reproducible; players need a different battle
// every time. An explicit ?seed= always wins so any match can be replayed.
export function resolveSeed(
  params: URLSearchParams,
  random: () => number,
): number {
  const explicit = params.get('seed');
  if (explicit !== null && Number.isFinite(Number(explicit)))
    return Number(explicit);
  return params.get('test') === '1' ? 42 : random();
}
export const testMode = (): boolean =>
  new URLSearchParams(location.search).get('test') === '1';
