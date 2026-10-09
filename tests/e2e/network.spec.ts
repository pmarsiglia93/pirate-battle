import { test, expect } from '@playwright/test';
import { start, finish, scenario } from './helpers';
test('ranking pagination, configuration filter, tabs and empty history', async ({
  page,
}) => {
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'Captain Flint', exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByLabel('Battle configuration').selectOption('180s-4s');
  await expect(
    page.getByText('No battles recorded yet.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Ranking', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'Match History' }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByText('No battles recorded yet.', { exact: false }),
  ).toBeVisible();
});
test('history supports fixture pagination and visible loading', async ({
  page,
}) => {
  await page.goto('/?test=1&scenario=many-pages');
  await page
    .getByRole('button', { name: 'Match History', exact: true })
    .click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await scenario(page, 'slow');
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Loading');
  await expect(page.locator('tbody tr')).toHaveCount(5);
});
for (const [failure, tab] of [
  ['ranking-fails', 'Ranking'],
  ['history-fails', 'Match History'],
] as const)
  test(`${failure} is recoverable and never blocks Play`, async ({ page }) => {
    await page.goto(`/?test=1&scenario=${failure}`);
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Unable to load');
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await scenario(page, 'success');
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('canvas')).toBeVisible();
  });
test('completed match updates both tabs exactly once', async ({ page }) => {
  await start(page);
  await finish(page);
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page
    .getByRole('button', { name: 'Match History', exact: true })
    .click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(
    page.getByRole('cell', { name: 'Destroyed', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Ranking', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Next page' }).click();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(
    page.getByRole('cell', { name: 'Captain Jack', exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pirate:pending') ?? '[]').length,
    ),
  ).toBe(0);
});
test('failed registration remains pending after refresh and recovers', async ({
  page,
}) => {
  await start(page, '&scenario=network-error');
  await finish(page);
  await expect(page.getByRole('status')).toHaveText('Pending');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pirate:pending') ?? '[]').length,
    ),
  ).toBe(1);
  await page.goto('/?test=1&scenario=success');
  await expect(
    page.getByRole('heading', { name: 'Battle complete' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Saved');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pirate:pending') ?? '[]').length,
    ),
  ).toBe(0);
});
test('timeout after commit retries idempotently', async ({ page }) => {
  await start(page, '&scenario=register-timeout-after-commit');
  await finish(page);
  await expect(page.getByRole('status')).toHaveText('Saved', {
    timeout: 12000,
  });
  const data = await page.evaluate(() => {
    const result = JSON.parse(localStorage.getItem('pirate:lastResult')!);
    const db = JSON.parse(localStorage.getItem('pirate:db')!);
    return db.filter((r: { matchId: string }) => r.matchId === result.matchId);
  });
  expect(data).toHaveLength(1);
  const response = await page.evaluate(async (record) => {
    const r = await fetch(`/api/matches/${record.matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return r.status;
  }, data[0]);
  expect(response).toBe(200);
});
test('late page one response cannot overwrite page two', async ({ page }) => {
  await page.goto('/?test=1&scenario=out-of-order');
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  await expect(page.getByRole('tabpanel')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  const expected = await page.locator('tbody').innerText();
  await page.getByRole('button', { name: 'Previous page' }).click();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByRole('tabpanel')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await page.waitForTimeout(1400);
  expect(await page.locator('tbody').innerText()).toBe(expected);
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
});
test('4xx registration shows Failed with retry and allows another match', async ({
  page,
}) => {
  await start(page, '&scenario=http-4xx');
  await finish(page);
  await expect(page.getByRole('status')).toHaveText('Failed');
  await expect(
    page.getByRole('button', { name: 'Retry', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Play Again', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pirate:pending') ?? '[]').length,
    ),
  ).toBe(1);
});

test('offline submission recovers through Retry without duplicating', async ({
  page,
}) => {
  await start(page, '&scenario=offline-then-recover');
  await finish(page);
  await expect(page.getByRole('status')).toHaveText('Pending');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pirate:pending') ?? '[]').length,
    ),
  ).toBe(0);
});

test('query Retry works and mock reset restores fixture pages', async ({
  page,
}) => {
  await page.goto('/?test=1&scenario=http-4xx');
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await scenario(page, 'many-pages');
  await page
    .getByRole('button', { name: 'Reset mock data', exact: true })
    .click();
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.getByText('Page 1 of 12')).toBeVisible();
});
