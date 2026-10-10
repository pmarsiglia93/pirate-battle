import { Assets, Texture } from 'pixi.js';
const variant = devicePixelRatio >= 2 ? 'retina' : 'default';
export const assetPath = (name: string): string =>
  `/assets/png/${variant}/${name}.png`;
const names = [
  ...[2, 8, 14, 20, 3, 9, 15, 21, 5, 11, 17, 23].map((n) => `ships/ship_${n}`),
  ...[1, 2, 3, 17, 18, 19, 23, 24, 33, 34, 35, 49, 71, 73].map(
    (n) => `tiles/tile_${n}`,
  ),
  'ship_parts/cannon_ball',
  'ship_parts/wood_1',
  'effects/explosion_1',
  'effects/explosion_2',
  'effects/explosion_3',
  'effects/fire_1',
  'effects/fire_2',
  'ui/hud/enemy_health_frame',
  'ui/hud/enemy_health_fill_green',
  'ui/hud/enemy_health_fill_red',
];
export async function loadAssets(
  progress: (value: number) => void,
): Promise<void> {
  let loaded = 0;
  progress(0);
  Assets.setPreferences({ preferWorkers: false });
  const results = await Promise.allSettled(
    names.map(async (name) => {
      await Assets.load<Texture>(assetPath(name));
      progress(++loaded / names.length);
    }),
  );
  if (results.some((result) => result.status === 'rejected'))
    throw new Error('Asset loading failed');
}
export const texture = (name: string): Texture =>
  Assets.get<Texture>(assetPath(name));

export const cachedTextureCount = (): number =>
  names.filter((name) => Assets.cache.has(assetPath(name))).length;

export function releaseGpuHandles(): void {
  for (const name of names)
    if (Assets.cache.has(assetPath(name))) texture(name).source.unload();
}
