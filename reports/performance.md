# Performance and resource lifecycle

Final measurements taken 2026-10-10 (UTC) on the optimized production build. Every number below comes from a committed raw file; nothing is estimated.

| Result                                  | Software rasterizer | Hardware GPU |
| --------------------------------------- | ------------------: | -----------: |
| Average FPS (target 60)                 |               26.83 |    **60.01** |
| p95 frame interval                      |            50.10 ms |     16.70 ms |
| Slowest frame                           |                   — |     16.80 ms |
| Game script per frame, average          |             0.43 ms |      0.43 ms |
| Game script per frame, p95              |             0.80 ms |      0.60 ms |
| Peak simulation entities (with effects) |                  28 |           28 |
| Peak live display objects               |                 100 |           98 |

**The 60 FPS target is met on the hardware GPU of the reference machine and is not met on Chromium's software rasterizer.** In both profiles the game's own work — fixed-step simulation, scene update and Pixi draw submission — costs under half a millisecond per frame, about 3% of a 16.7 ms budget. The software profile is limited by SwiftShader rasterizing a 1093 × 615 WebGL surface on the CPU, not by the game.

## Environment

- CPU: Intel Core i5-3470 @ 3.20 GHz, 4 logical CPUs, 15.1 GiB RAM. GPU: AMD Radeon RX 580 2048SP.
- OS: Linux 6.14.0-37-generic x64.
- Browser: Playwright Chromium 156.0.8078.4, headless.
- Viewport 1280 × 720, device pixel ratio 1. The arena canvas backing is 1093 × 615 pixels; the logical world stays 1600 × 900.
- Build: `npm run build`, served by `vite preview`, local MSW, audio muted by test mode.
- Match configuration: defaults (120 s session, 4 s spawn interval), seed 42. All three weapons held and real keyboard events steering a loop around the islands.
- The host was not idle: unrelated containers kept the load average between 2.8 and 6.5 during the runs. That noise affects the CPU-bound software profile far more than the GPU profile.

| Profile             | Chromium flags                                                                    | WebGL renderer reported                                   | Raw data                                     |
| ------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------- |
| Software rasterizer | defaults                                                                          | ANGLE, Vulkan 1.3.0, SwiftShader Device (Subzero)         | [performance.json](performance.json)         |
| Hardware GPU        | `--enable-gpu --ignore-gpu-blocklist --use-angle=vulkan --enable-features=Vulkan` | ANGLE, Vulkan 1.4.305, AMD Radeon RX 580 (RADV POLARIS10) | [performance-gpu.json](performance-gpu.json) |

Reproduce with `npm run build`, then `npm run perf` (software) or `npm run perf:gpu` (hardware). The GPU script exits with an error if Chromium silently falls back to software.

## Three-minute sample

| Metric                       | Software | Hardware GPU |
| ---------------------------- | -------: | -----------: |
| Active frame-interval sample | 180.01 s |     180.01 s |
| Frames                       |     4830 |        10803 |
| Average FPS                  |    26.83 |        60.01 |
| p95 frame interval           | 50.10 ms |     16.70 ms |
| Frames slower than 17.5 ms   |        — |            0 |
| Battles needed for 180 s     |        5 |            5 |

The default match lasts 120 seconds and the benchmark captain is eventually sunk, so a 180 second sample spans several matches. The harness restarts after each real ending; it never extends a match, grants invulnerability or injects entities. It measures `requestAnimationFrame` intervals while a match is running and excludes loading and result transitions. Each frame advances the same fixed-step simulation with the production catch-up ceiling of eight steps and renders with Pixi, so this is not an accelerated synthetic estimate.

"Game script per frame" is the wall time of that advance call: simulation steps, scene synchronization and Pixi's WebGL command submission. It does not include the GPU or software rasterizer executing those commands, which is where the two profiles differ.

## Before and after

All rows use the same machine, browser, viewport, seed and software rasterizer.

| Stage                         | Average FPS | p95 frame | Peak display objects | Raw data                                             |
| ----------------------------- | ----------: | --------: | -------------------: | ---------------------------------------------------- |
| Before optimization           |        9.17 |    150 ms |                  478 | [performance-before.json](performance-before.json)   |
| After rendering optimizations |       28.76 |     50 ms |                  102 | [performance-interim.json](performance-interim.json) |
| Final build, software         |       26.83 |   50.1 ms |                  100 | [performance.json](performance.json)                 |
| Final build, hardware GPU     |       60.01 |   16.7 ms |                   98 | [performance-gpu.json](performance-gpu.json)         |

The interim and final software rows are the same rendering code; the final build only adds the teardown fix described below, which does not run during a match. The 28.76 → 26.83 difference is run-to-run variance on a loaded host, not a regression.

Optimizations applied:

1. The canvas backing follows the visible arena size (1093 × 615 here) instead of always rasterizing 1600 × 900. A `ResizeObserver` resizes the renderer and scales the scene; the logical world is unchanged.
2. About 375 water sprites became one `TilingSprite`.
3. Multisample antialiasing is off. The art is raster sprites, so it gave no visible benefit.
4. Projectile and effect sprites are pooled; healthbar geometry is rebuilt only when HP changes.
5. React never receives per-frame transforms; the HUD store publishes at most every 100 ms of simulation time.

Not done, deliberately: with script time at 0.43 ms there is no measurable CPU-side gain left to find, and the remaining software cost is per-pixel rasterization. Lowering it would mean rendering fewer pixels, which trades away image quality to improve a number that only applies to machines without a GPU.

## Memory and lifecycle

### What was wrong

The earlier investigation saw the JS heap rise across repeated matches and counted about two extra Pixi `BindGroup` objects and two extra listener entries per cycle in development, without finding the owner.

The owner is PixiJS 8.22's `GlBackBufferSystem`. Its `init()` creates a blit shader whose bind group subscribes to the global `Texture.WHITE` source, and its `destroy()` never destroys that shader. `Texture.WHITE` lives for the whole page, so each destroyed `Application` left one `BindGroup` and one `change` listener reachable from it. React Strict Mode mounts twice in development, which is why two per cycle were observed. The mesh and particle pipes create similar shaders and do release them.

`PixiRenderer.destroy()` now destroys that shader after destroying the application. `Shader.destroy()` is idempotent, so the workaround stays harmless when the library fixes this itself.

| Counted on the development build after each exit                                                          | Before fix, cycle 1 → 8 | After fix, cycle 1 → 12 |
| --------------------------------------------------------------------------------------------------------- | ----------------------: | ----------------------: |
| Live `BindGroup` instances                                                                                |                  5 → 19 |                   1 → 1 |
| `change` listeners on Pixi's built-in textures                                                            |                  4 → 18 |                   0 → 0 |
| Application, WebGLRenderer, Shader, Container, Sprite, Graphics, Texture, TextureSource, Ticker instances |                constant |                constant |

Instances were counted with the DevTools `Runtime.queryObjects` call after a forced GC, so these are live objects, not allocations.

### Thirty cycles on the production build

`npm run memory` plays 10 simulated seconds with the cannon held, exits to the menu, waits two frames, forces GC twice and samples. Raw data: [memory-followup.json](memory-followup.json). The pre-fix run is kept in [memory-followup-before.json](memory-followup-before.json).

| After cycle | JS heap (MiB) | Applications | Display objects | Canvases | Cached textures | Built-in texture listeners |
| ----------- | ------------: | -----------: | --------------: | -------: | --------------: | -------------------------: |
| 0 (warm-up) |          8.04 |            0 |               0 |        0 |              36 |                          0 |
| 1           |          8.32 |            0 |               0 |        0 |              36 |                          0 |
| 5           |          8.91 |            0 |               0 |        0 |              36 |                          0 |
| 10          |          9.39 |            0 |               0 |        0 |              36 |                          0 |
| 20          |          9.67 |            0 |               0 |        0 |              36 |                          0 |
| 30          |          9.80 |            0 |               0 |        0 |              36 |                          0 |

Heap growth per cycle falls from 153 KB over the first five cycles to 12 KB over the last five.

### Classifying the remaining heap growth

A rising heap is not by itself a leak, so the remainder was attributed with a heap-snapshot class diff between cycles 20 and 40 of a 40-cycle production run ([heap-snapshot-diff.json](heap-snapshot-diff.json)). The 433 KiB delta contains no Pixi or game class.

| Category             | What it is                                                                                                                                                                                                                                                                                | Evidence                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Real leak, fixed     | One `BindGroup` and listener per `Application`, from the Pixi back-buffer shader.                                                                                                                                                                                                         | Instance counts above; now constant.                                                      |
| Intentional cache    | 36 textures held by Pixi `Assets` so a new match does not reload or re-decode art. GPU handles are released when the last application exits and re-uploaded on demand.                                                                                                                    | Constant at 36 in every sample.                                                           |
| Legitimate, bounded  | One `Simulation`, clock, renderer and two sprite pools per match. In test mode the last finished match stays reachable through `window.__PIRATE_TEST__` until the next match replaces it, so the result screen can be inspected.                                                          | Counts return to zero after exit.                                                         |
| Temporary            | V8 compiled code and strings as more code paths warm up.                                                                                                                                                                                                                                  | Largest two entries of the diff; growth per cycle decays by more than 10×.                |
| Measurement artifact | Forcing GC evicts the six touch-control icons from the image memory cache. They are re-requested each cycle through MSW, whose worker transfers a `ReadableStream` and `MessagePort` to the page per response. DevTools network records and performance-timeline entries also accumulate. | Exactly 6 per cycle of each native class; 0 requests per cycle without forced GC, 6 with. |

### Five cycles inside the timed benchmark

Both benchmark runs also record five start/play/exit cycles after a warm-up. Applications, display objects and canvases returned to zero in all ten, with 36 cached textures and no accumulated listeners. Heap after exit rose from 8.06 MiB to 8.92 MiB (software run) and from 8.05 MiB to 8.89 MiB (GPU run), consistent with the warm-up curve above.

### Other lifecycle checks

- Keyboard, blur, resize and visibility listeners are removed in the same effect cleanup that added them; the `ResizeObserver` is disconnected.
- `Application.destroy()` stops and removes its ticker; shared and system ticker listener counts are constant across cycles.
- [strict-mode.json](strict-mode.json) records three development double-mount cycles: one live application during each battle and none after exit.
- The E2E suite asserts all of this on every run: four consecutive matches must leave zero applications, zero display objects, zero canvases, a constant texture cache and a constant built-in listener count.
- Unhandled browser errors during profiling: 0.

## Limitations

- One reference machine. No mobile device was profiled, and mobile GPU memory was not measured.
- The software figure depends heavily on CPU speed and host load; treat it as a worst case for a machine with no usable GPU.
- JS heap readings include React, TanStack Query, MSW and browser bookkeeping. They are not a GPU allocation measurement.
- Forced-GC cycle tests are evidence of correct teardown for the resources they count. They cannot prove the absence of every possible leak.
- The fix reads a private Pixi field. It is guarded and idempotent, but a future Pixi release could rename the field, at which point the E2E listener assertion would fail and flag it.
- [heap-investigation.json](heap-investigation.json) is the earlier shallow-count evidence that first showed the extra `BindGroup` objects; it is kept for the record.
