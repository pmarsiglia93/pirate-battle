import { test, expect } from '@playwright/test';
import { start, state, advance, hold, finish, steer } from './helpers';
import { blocked } from '../../src/game/world/arena';
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});
test('options validate, save, and survive refresh', async ({ page }) => {
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByLabel('Game session time').fill('59');
  await page.getByLabel('Enemy spawn time').fill('0');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByLabel('Game session time')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByLabel('Enemy spawn time')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Game session time').fill('60');
  await page.getByLabel('Enemy spawn time').fill('15');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByLabel('Game session time')).toHaveValue('60');
  await expect(page.getByLabel('Enemy spawn time')).toHaveValue('15');
});
test('asset failure presents Retry and recovers', async ({ page, context }) => {
  await page.route('**/ships/ship_8.png', (route) => route.abort());
  await context.route('**/ships/ship_8.png', (route) => route.abort());
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load');
  await page.unroute('**/ships/ship_8.png');
  await context.unroute('**/ships/ship_8.png');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
});
test('movement, rotation, world bounds and island sliding', async ({
  page,
}) => {
  await start(page);
  await hold(page, 'w', 1000);
  expect((await state(page)).player.y).toBeCloseTo(290, 2);
  await hold(page, 'a', (Math.PI / 2 / 2.2) * 1000);
  expect((await state(page)).player.angle).toBeCloseTo(-Math.PI, 1);
  await hold(page, 'w', 2400);
  let s = await state(page);
  expect(s.player.x).toBeGreaterThanOrEqual(537);
  expect(s.player.x).toBeLessThan(541);
  expect(blocked(s.player.x, s.player.y, s.player.radius)).toBe(false);
  await hold(page, 'd', (Math.PI / 2 / 2.2) * 1000);
  await hold(page, 'w', 3000);
  s = await state(page);
  expect(s.player.y).toBeGreaterThanOrEqual(25);
  expect(s.player.y).toBeLessThan(30);
});
test('front and parallel broadside shots respect cooldown and lifetime', async ({
  page,
}) => {
  await start(page);
  await hold(page, ' ', 17);
  let s = await state(page);
  expect(s.projectiles).toHaveLength(1);
  const initial = s.projectiles[0]!.id;
  await hold(page, ' ', 200);
  expect((await state(page)).projectiles).toHaveLength(1);
  await hold(page, 'q', 17);
  await hold(page, 'e', 17);
  s = await state(page);
  expect(s.projectiles).toHaveLength(7);
  const left = s.projectiles.filter((b) => b.vx < -500),
    right = s.projectiles.filter((b) => b.vx > 500);
  expect(left).toHaveLength(3);
  expect(right).toHaveLength(3);
  expect(new Set(left.map((b) => b.vx)).size).toBe(1);
  await advance(page, 1200);
  expect((await state(page)).projectiles.some((b) => b.id === initial)).toBe(
    false,
  );
});
test('both enemy types spawn on schedule and Shooter fires', async ({
  page,
}) => {
  await start(page);
  await advance(page, 3980);
  expect((await state(page)).spawnCount).toBe(0);
  await advance(page, 20);
  let s = await state(page);
  expect(s.enemies[0]?.kind).toBe('chaser');
  expect(
    Math.hypot(s.enemies[0]!.x - s.player.x, s.enemies[0]!.y - s.player.y),
  ).toBeGreaterThanOrEqual(450);
  const first = { ...s.enemies[0]! };
  await advance(page, 4000);
  s = await state(page);
  expect(s.spawnCount).toBe(2);
  expect(s.enemies.some((e) => e.kind === 'shooter')).toBe(true);
  expect(s.enemies.find((e) => e.id === first.id)?.x).not.toBe(first.x);
  let fired = false;
  for (let i = 0; i < 80; i++) {
    await advance(page, 100);
    s = await state(page);
    if (s.projectiles.some((b) => b.owner === 'enemy')) {
      fired = true;
      break;
    }
  }
  expect(fired).toBe(true);
});
test('real aimed shots damage a Chaser and score exactly once', async ({
  page,
}) => {
  await start(page);
  await advance(page, 4000);
  const targetId = (await state(page)).enemies[0]!.id;
  let damaged = false;
  for (let i = 0; i < 120; i++) {
    const s = await state(page),
      enemy = s.enemies.find((e) => e.id === targetId);
    if (!enemy) break;
    const desired = Math.atan2(enemy.y - s.player.y, enemy.x - s.player.x),
      delta = Math.atan2(
        Math.sin(desired - s.player.angle),
        Math.cos(desired - s.player.angle),
      );
    await page.keyboard.down(' ');
    if (Math.abs(delta) > 0.04) await page.keyboard.down(delta > 0 ? 'd' : 'a');
    await advance(page, 100);
    await page.keyboard.up('a');
    await page.keyboard.up('d');
    await page.keyboard.up(' ');
    const after = await state(page);
    if (after.enemies.find((e) => e.id === targetId)?.hp !== 30) damaged = true;
    if (after.score > 0) break;
  }
  const result = await state(page);
  expect(damaged).toBe(true);
  expect(result.score).toBe(1);
  expect(result.enemies.some((e) => e.id === targetId)).toBe(false);
  await advance(page, 100);
  expect((await state(page)).score).toBe(1);
});
test('pause and blur freeze time, clear held input and trap focus', async ({
  page,
}) => {
  await start(page);
  await page.keyboard.down('w');
  await advance(page, 500);
  await page.keyboard.press('p');
  const before = await state(page);
  await advance(page, 10000);
  expect(await state(page)).toEqual(before);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('button', { name: 'Main Menu', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await advance(page, 100);
  expect((await state(page)).player.y).toBe(before.player.y);
  await page.keyboard.up('w');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const paused = await state(page);
  await advance(page, 10000);
  expect(await state(page)).toEqual(paused);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await state(page)).status).toBe('running');
});
test('death freezes simulation, result persists and restart is clean', async ({
  page,
}) => {
  await start(page);
  await finish(page);
  const ended = await state(page);
  expect(ended.endReason).toBe('destroyed');
  expect(ended.score).toBe(0);
  await advance(page, 30000);
  expect(await state(page)).toEqual(ended);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Battle complete' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Play Again', exact: true }).click();
  await page.waitForFunction(
    () => window.__PIRATE_TEST__?.getState().status === 'running',
  );
  const fresh = await state(page);
  expect(fresh.player.hp).toBe(100);
  expect(fresh.elapsed).toBe(0);
  expect(fresh.enemies).toHaveLength(0);
});
test('a sailing captain survives to the configured time limit', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/?test=1&seed=8');
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByLabel('Game session time').fill('60');
  await page.getByLabel('Enemy spawn time').fill('15');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => !!window.__PIRATE_TEST__);
  const points = [
    [800, 70],
    [1500, 70],
    [1500, 820],
    [750, 820],
    [750, 70],
  ];
  let waypoint = 0;
  await page.keyboard.down(' ');
  for (let i = 0; i < 250; i++) {
    const s = await state(page);
    if (s.status === 'ended') break;
    const point = points[waypoint % points.length]!;
    if (Math.hypot(s.player.x - point[0]!, s.player.y - point[1]!) < 45)
      waypoint++;
    const next = points[waypoint % points.length]!;
    await steer(page, next[0]!, next[1]!, 500);
  }
  await page.keyboard.up(' ');
  const s = await state(page);
  expect(s.endReason).toBe('time-up');
  expect(s.elapsed).toBe(60);
  await expect(
    page.getByRole('heading', { name: 'Battle complete' }),
  ).toBeVisible();
});
test('repeated exits abandon matches and release canvases', async ({
  page,
}) => {
  await page.goto('/?test=1');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(() => !!window.__PIRATE_TEST__);
    await advance(page, 1000);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
  }
  await page
    .getByRole('button', { name: 'Match History', exact: true })
    .click();
  await expect(
    page.getByText('No battles recorded yet.', { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('pirate:lastResult')),
  ).toBeNull();
});
test('repeated matches release every Pixi application, scene and listener', async ({
  page,
}) => {
  await page.goto('/?test=1&seed=42');
  const samples = [];
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(
      () => window.__PIRATE_TEST__?.getState().status === 'running',
    );
    await hold(page, ' ', 3000);
    const during = await page.evaluate(() => window.__PIRATE_RESOURCES__!());
    expect(during.applications).toBe(1);
    expect(during.displayObjects).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    samples.push(await page.evaluate(() => window.__PIRATE_RESOURCES__!()));
  }
  for (const sample of samples) {
    expect(sample.applications).toBe(0);
    expect(sample.displayObjects).toBe(0);
    // The texture cache is intentionally warm; it must neither grow nor empty.
    expect(sample.cachedTextures).toBe(samples[0]!.cachedTextures);
    // Listeners on Pixi's global textures must not accumulate per match.
    expect(sample.sharedTextureListeners).toBe(
      samples[0]!.sharedTextureListeners,
    );
  }
});
test('mobile multitouch sails and fires simultaneously', async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch-specific coverage');
  await start(page);
  const sail = await page
      .getByRole('button', { name: 'Sail forward', exact: true })
      .boundingBox(),
    fire = await page
      .getByRole('button', { name: 'Fire front cannon', exact: true })
      .boundingBox();
  expect(sail).not.toBeNull();
  expect(fire).not.toBeNull();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: sail!.x + sail!.width / 2, y: sail!.y + sail!.height / 2, id: 1 },
      { x: fire!.x + fire!.width / 2, y: fire!.y + fire!.height / 2, id: 2 },
    ],
  });
  await advance(page, 500);
  const s = await state(page);
  expect(s.player.y).toBeLessThan(450);
  expect(s.projectiles.length).toBeGreaterThan(0);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  const y = s.player.y;
  await advance(page, 100);
  expect((await state(page)).player.y).toBe(y);
});

test('refresh abandons an unfinished battle without recording it', async ({
  page,
}) => {
  await start(page);
  await advance(page, 2000);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('pirate:lastResult')),
  ).toBeNull();
  await page
    .getByRole('button', { name: 'Match History', exact: true })
    .click();
  await expect(
    page.getByText('No battles recorded yet.', { exact: false }),
  ).toBeVisible();
});

test('portrait pauses until the captain explicitly resumes in landscape', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Mobile orientation coverage');
  await start(page);
  await advance(page, 1000);
  await page.setViewportSize({ width: 412, height: 915 });
  await expect(
    page.getByRole('heading', { name: 'Turn the tide' }),
  ).toBeVisible();
  const before = await state(page);
  expect(before.status).toBe('paused');
  await advance(page, 5000);
  expect(await state(page)).toEqual(before);
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect((await state(page)).status).toBe('running');
});
