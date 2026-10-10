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
export const testMode = (): boolean =>
  new URLSearchParams(location.search).get('test') === '1';
