import { expect, type Page } from '@playwright/test';
import type { GameState } from '../../src/game/core/types';
export const state = (page: Page): Promise<GameState> =>
  page.evaluate(() => window.__PIRATE_TEST__!.getState());
export const advance = (page: Page, ms: number): Promise<void> =>
  page.evaluate((value) => window.__PIRATE_TEST__!.advance(value), ms);
export async function start(page: Page, query = ''): Promise<void> {
  await page.goto(`/?test=1&seed=42${query}`);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => !!window.__PIRATE_TEST__);
}
export async function hold(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await advance(page, ms);
  await page.keyboard.up(key);
}
export async function finish(page: Page): Promise<void> {
  await advance(page, 180000);
  await expect(
    page.getByRole('heading', { name: 'Battle complete' }),
  ).toBeVisible();
}
export async function scenario(page: Page, name: string): Promise<void> {
  await page.getByText('Network scenarios', { exact: true }).click();
  await page.getByLabel('API scenario').selectOption(name);
}
export async function steer(
  page: Page,
  x: number,
  y: number,
  ms = 100,
): Promise<void> {
  const s = await state(page);
  const target = Math.atan2(y - s.player.y, x - s.player.x),
    delta = Math.atan2(
      Math.sin(target - s.player.angle),
      Math.cos(target - s.player.angle),
    );
  if (Math.abs(delta) > 0.06) {
    const key = delta > 0 ? 'd' : 'a';
    await hold(page, key, Math.min(ms, (Math.abs(delta) / 2.2) * 1000));
  } else await hold(page, 'w', ms);
}
