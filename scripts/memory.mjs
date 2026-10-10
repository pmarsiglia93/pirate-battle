import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

// Repeats start → play → pause → exit and samples what survives each exit.
// Heap alone cannot prove or disprove a leak, so every sample also carries
// countable resources that must return to a fixed value.
const cycles = Number(process.env.MEMORY_CYCLES ?? 30);
const port = 4175;
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--port',
    String(port),
    '--host',
    '127.0.0.1',
  ],
  { stdio: 'ignore' },
);
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) break;
    } catch {
      /* Wait for preview. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info'],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await page.goto(`http://127.0.0.1:${port}/?test=1&seed=42`);
  const samples = [];
  for (let cycle = 0; cycle <= cycles; cycle++) {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(
      () => window.__PIRATE_TEST__?.getState().status === 'running',
    );
    await page.keyboard.down(' ');
    await page.evaluate(() => window.__PIRATE_TEST__.advance(10000));
    await page.keyboard.up(' ');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('HeapProfiler.collectGarbage');
    const sample = await page.evaluate(() => ({
      heap: performance.memory.usedJSHeapSize,
      ...window.__PIRATE_RESOURCES__(),
      canvases: document.querySelectorAll('canvas').length,
    }));
    samples.push({ cycle, ...sample });
    console.log(
      cycle,
      (sample.heap / 2 ** 20).toFixed(2),
      sample.applications,
      sample.displayObjects,
      sample.canvases,
      sample.cachedTextures,
      sample.sharedTextureListeners,
    );
  }
  // Cycle 0 is warm-up: it loads textures and compiles most of the code.
  const measured = samples.slice(1);
  const perCycle = (from, to) =>
    (measured[to].heap - measured[from].heap) / (to - from);
  const last = measured.length - 1;
  const summary = {
    cycles,
    heapAfterWarmUp: samples[0].heap,
    heapAfterLastCycle: measured[last].heap,
    heapGrowthPerCycleFirstFive: Math.round(perCycle(0, 4)),
    heapGrowthPerCycleLastFive: Math.round(perCycle(last - 4, last)),
    countsReturnToZero: measured.every(
      (row) =>
        row.applications === 0 &&
        row.displayObjects === 0 &&
        row.canvases === 0,
    ),
    cachedTexturesConstant: measured.every(
      (row) => row.cachedTextures === measured[0].cachedTextures,
    ),
    sharedTextureListenersConstant: measured.every(
      (row) =>
        row.sharedTextureListeners === measured[0].sharedTextureListeners,
    ),
  };
  await writeFile(
    'reports/memory-followup.json',
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        note: `${cycles} measured cycles after one warm-up (cycle 0). Each cycle plays 10 simulated seconds with the front cannon held, exits to the menu, waits two frames and forces GC twice before reading the precise JS heap.`,
        summary,
        errors,
        samples,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(summary, null, 2));
  if (
    errors.length ||
    !summary.countsReturnToZero ||
    !summary.cachedTexturesConstant ||
    !summary.sharedTextureListenersConstant
  )
    process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
