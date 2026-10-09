import { test, expect } from '@playwright/test';
import { start, finish } from './helpers';
test('menu visual baseline', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('menu.png', { animations: 'disabled' });
});
test('stable arena visual baseline', async ({ page }) => {
  await start(page);
  await expect(page).toHaveScreenshot('arena.png', { animations: 'disabled' });
});
test('result visual baseline', async ({ page }) => {
  await start(page);
  await finish(page);
  await expect(page.getByRole('status')).toHaveText('Saved');
  await expect(page).toHaveScreenshot('result.png', { animations: 'disabled' });
});
