import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';

const durationMs = Number(process.env.PERF_DURATION_MS ?? 180000);
// PERF_GPU=1 asks headless Chromium for the host GPU through ANGLE/Vulkan. The
// default stays on Chromium's software rasterizer (SwiftShader), which matches
// the earlier measurements and what a GPU-less CI machine would run.
const gpu = process.env.PERF_GPU === '1';
const output = `reports/performance${gpu ? '-gpu' : ''}.json`;
const port = 4174;
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
    args: [
      '--enable-precise-memory-info',
      ...(gpu
        ? [
            '--enable-gpu',
            '--ignore-gpu-blocklist',
            '--use-angle=vulkan',
            '--enable-features=Vulkan',
          ]
        : []),
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.error('Benchmark browser error:', error.message);
  });
  await page.goto(`http://127.0.0.1:${port}/?test=1&seed=42`);
  const start = async () => {
    await page.getByRole('button', { name: /^(Play|Play Again)$/ }).click();
    await page.waitForFunction(
      () => window.__PIRATE_TEST__?.getState().status === 'running',
    );
  };
  const cdp = await context.newCDPSession(page);
  const sample = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    return page.evaluate(() => ({
      heap: performance.memory?.usedJSHeapSize ?? null,
      ...window.__PIRATE_RESOURCES__(),
      canvases: document.querySelectorAll('canvas').length,
    }));
  };
  const cycle = async () => {
    await start();
    await page.keyboard.down(' ');
    await page.evaluate(() => window.__PIRATE_TEST__.advance(10000));
    await page.keyboard.up(' ');
    const during = await sample();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    return { during, after: await sample() };
  };
  console.log('Starting lifecycle warm-up');
  await cycle();
  console.log('Warm-up finished');
  const baseline = await sample();
  const memory = [];
  for (let i = 0; i < 5; i++) {
    console.log(`Lifecycle cycle ${i + 1}`);
    memory.push({ cycle: i + 1, ...(await cycle()) });
  }
  console.log('Starting timed RAF measurement');
  const frames = [],
    scriptTimes = [],
    rounds = [];
  let maxEntities = 0,
    maxDisplayObjects = 0,
    canvasSize = null;
  while (frames.reduce((sum, value) => sum + value, 0) < durationMs) {
    console.log('Starting benchmark battle');
    await start();
    console.log('Battle running');
    const remaining =
      durationMs - frames.reduce((sum, value) => sum + value, 0);
    const result = await page.evaluate(
      (budget) =>
        new Promise((resolve, reject) => {
          const watchdog = setTimeout(
            () => reject(new Error('RAF benchmark stalled')),
            budget + 15000,
          );
          const frames = [],
            scriptTimes = [];
          const canvas = document.querySelector('canvas');
          let previous = performance.now(),
            elapsed = 0,
            maxEntities = 0,
            maxDisplayObjects = 0,
            waypoint = 0;
          const points = [
              [800, 70],
              [1500, 70],
              [1500, 820],
              [750, 820],
              [750, 70],
            ],
            held = new Set();
          function key(code, down) {
            if (down === held.has(code)) return;
            window.dispatchEvent(
              new KeyboardEvent(down ? 'keydown' : 'keyup', {
                code,
                bubbles: true,
              }),
            );
            if (down) held.add(code);
            else held.delete(code);
          }
          function tick(now) {
            const delta = Math.max(0, now - previous);
            previous = now;
            const api = window.__PIRATE_TEST__,
              state = api.getState();
            if (elapsed >= budget || state.status === 'ended') {
              for (const code of [...held]) key(code, false);
              clearTimeout(watchdog);
              resolve({
                frames,
                scriptTimes,
                canvasSize: canvas ? [canvas.width, canvas.height] : null,
                maxEntities,
                maxDisplayObjects,
                activeSeconds: state.elapsed,
                endReason: state.endReason,
              });
              return;
            }
            const point = points[waypoint % points.length];
            if (
              Math.hypot(state.player.x - point[0], state.player.y - point[1]) <
              45
            )
              waypoint++;
            const target = points[waypoint % points.length],
              angle = Math.atan2(
                target[1] - state.player.y,
                target[0] - state.player.x,
              ),
              turn = Math.atan2(
                Math.sin(angle - state.player.angle),
                Math.cos(angle - state.player.angle),
              );
            key('KeyA', turn < -0.06);
            key('KeyD', turn > 0.06);
            key('KeyW', Math.abs(turn) < 0.15);
            key('Space', true);
            key('KeyQ', true);
            key('KeyE', true);
            // Simulation steps, scene update and Pixi's draw submission all run
            // inside advance(); the remainder of the interval is the browser's
            // rasterization, compositing and idle time.
            const scriptStart = performance.now();
            api.advance(Math.min(delta, (1000 * 8) / 60));
            scriptTimes.push(performance.now() - scriptStart);
            frames.push(delta);
            elapsed += delta;
            maxEntities = Math.max(
              maxEntities,
              1 +
                state.enemies.length +
                state.projectiles.length +
                state.effects.length,
            );
            maxDisplayObjects = Math.max(
              maxDisplayObjects,
              api.getResources().displayObjects,
            );
            requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }),
      remaining,
    );
    frames.push(...result.frames);
    scriptTimes.push(...result.scriptTimes);
    canvasSize = result.canvasSize ?? canvasSize;
    rounds.push({
      activeSeconds: result.activeSeconds,
      endReason: result.endReason,
    });
    maxEntities = Math.max(maxEntities, result.maxEntities);
    maxDisplayObjects = Math.max(maxDisplayObjects, result.maxDisplayObjects);
    console.log(
      `Measured ${(frames.reduce((s, v) => s + v, 0) / 1000).toFixed(1)} seconds; ${rounds.length} battle(s).`,
    );
  }
  const sorted = [...frames].sort((a, b) => a - b),
    sortedScript = [...scriptTimes].sort((a, b) => a - b),
    sum = frames.reduce((s, v) => s + v, 0);
  const environment = {
    date: new Date().toISOString(),
    cpu: os.cpus()[0]?.model,
    logicalCpus: os.cpus().length,
    ramGiB: (os.totalmem() / 2 ** 30).toFixed(1),
    os: `${os.platform()} ${os.release()} ${os.arch()}`,
    browser: browser.version(),
    profile: gpu ? 'hardware GPU (ANGLE Vulkan)' : 'software (SwiftShader)',
    canvasBackingPixels: canvasSize,
    viewport:
      '1280 × 720, DPR 1; fixed 1600 × 900 logical world, canvas backing sized to the visible arena',
    renderer: await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const gl = canvas?.getContext('webgl2');
      if (!gl) return 'WebGL (unavailable after match)';
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
    }),
  };
  const metrics = {
    sampleSeconds: sum / 1000,
    frames: frames.length,
    averageFps: frames.length / (sum / 1000),
    p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
    averageScriptMs:
      scriptTimes.reduce((s, v) => s + v, 0) / scriptTimes.length,
    p95ScriptMs: sortedScript[Math.floor(sortedScript.length * 0.95)],
    maxEntities,
    maxDisplayObjects,
    rounds,
  };
  const report = {
    environment,
    metrics,
    baseline,
    memory,
    errors,
    frameTimesMs: frames,
    scriptTimesMs: scriptTimes.map((value) => Number(value.toFixed(2))),
  };
  await mkdir('reports', { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2));
  // reports/performance.md is written by hand from these JSON files so that a
  // rerun can never overwrite the before/after comparison.
  console.log(`Wrote ${output}`);
  console.log(
    JSON.stringify({ environment, metrics, memory, errors }, null, 2),
  );
  const software = /swiftshader|llvmpipe/i.test(environment.renderer);
  if (gpu && software) {
    console.error(
      'PERF_GPU=1 was requested but Chromium fell back to software.',
    );
    process.exitCode = 1;
  }
  if (
    errors.length ||
    memory.some(
      (row) =>
        row.after.applications !== 0 ||
        row.after.displayObjects !== 0 ||
        row.after.canvases !== 0,
    )
  )
    process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
