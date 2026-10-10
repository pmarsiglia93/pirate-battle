# Architecture

## Decisions

Use npm with a committed lockfile, Vite, React Strict Mode and PixiJS v8. The simulation is pure TypeScript. All balance numbers live in one configuration; each match copies its options. The logical arena is 1600 × 900, with 64 px solid tiles and circle hulls. Axis-separated movement slides along solid cells.

Assets were inspected before implementation. Ship families have intact, lightly damaged, heavily damaged and sunk variants: pirate 2/8/14/20, red 3/9/15/21, blue 5/11/17/23. Sprites point upward; render rotation adds π/2 to mathematical headings. UI atlas border and layout metadata remain in 1× logical units, including the retina atlas. Individual PNGs avoid atlas cropping ambiguity. Water is tile 73; shore tiles 1/2/3/17/18/19/33/34/35 surround grass and palms.

Spawn limits are 1.5–15 seconds, retaining the requested 4 second default. No balance changes yet. Seeded randomness is independent from the frame rate.

See docs/PLAN.md for delivery status.

## Simulation, lifecycle and accessibility

The clock integrates 1/60 second ticks and caps production catch-up at eight steps per frame. Manual test time divides a requested interval into the same fixed ticks. Time boundaries terminate before combat on that tick. Damage clamps HP and scoring requires a previously living target; subsequent bullets cannot score that target again. Swept circle tests choose the nearest ship while tile samples prevent tunnelling through islands. Axis-separated circle/grid movement permits sliding.

Enemy steering samples headings with a forward obstacle feeler, then turns at a bounded rate. The first two successful spawns guarantee one Chaser and one Shooter. Later choices use a seeded linear congruential RNG. Ram deaths never award points. Dead entities are excluded from collision and AI, and transient wreck sprites fade without participating in the simulation.

React owns screens and semantic controls; Pixi owns the arena scene. A match owns its simulation, fixed clock, input bindings, scene and sprite pools. A cancellation flag handles asynchronous `Application.init()` completing after unmount. Idempotent destruction removes the canvas, ticker and scene children while retaining Assets textures. Strict Mode remains enabled. Projectile and effect sprites are recycled; healthbar geometry changes only when HP changes.

The external HUD store publishes at most every 100 ms of simulation time, with immediate updates for damage, score and status changes. React does not receive continuous entity transforms. The native modal dialog makes the background inert; explicit first/last Tab handling also prevents focus moving into browser chrome. Blur/visibility loss clears the accumulator and input and never resumes automatically. The live region announces discrete status/low-health events. Touch buttons use pointer capture and independent actions. World coordinate conversion is isolated in `input/touch.ts`; this button-based control scheme does not require aiming coordinates.

## API and recovery

Axios receives the Query cancellation signal. Ranking keys contain configuration and page; history keys contain player and page. `keepPreviousData` preserves table content during pagination. Query mounts and window focus refetch; errors retry twice with exponential delay only for network failures and 5xx. A 4xx is immediately actionable. The result mutation uses the same retry policy and per-match in-flight coalescing.

A finished match receives a UUID once, then enters the durable pending queue before a PUT starts. PUT is idempotent by that UUID, returning 201 for creation and 200 for an existing record. Success removes the queue entry and invalidates both record queries. Refresh retries pending entries; failures retain them and never block gameplay. localStorage is the demo database, with an in-memory fallback when unavailable. This is a single-browser mock, not a shared leaderboard or authenticated backend.

Ranking order is score descending, duration ascending, ISO timestamp ascending, then match ID lexicographically ascending. Configuration identity is `sessionTime + "s-" + spawnTime + "s"`; rankings never compare different options. The current options are the default filter. Fixtures have fixed timestamps; the local identity is generated once. Scenarios intercept HTTP via the committed MSW worker in development and production.

## Test boundaries

`?test=1` exposes only time advancement, immutable snapshots, pre-tick reseeding and read-only resource counts. No teleport, damage, entity injection or score mutation exists in the browser hook. Combat E2E tests use actual keyboard events or Chromium multitouch input. The automatic Pixi ticker stops in this mode; every manual advance still updates scene objects and explicitly renders with Pixi. Stable screenshots therefore avoid timer and animation drift. Unit tests can construct edge-case states to isolate collision invariants without weakening the browser hook.

Assets load concurrently through Pixi Assets with progress and a settled failure boundary. Successful textures remain cached for retry. Worker image decoding is disabled to make asset interception predictable. Playwright routes both the page and browser context for the asset-failure case because MSW may own the outgoing bypass request. No renderer is created until the asset batch succeeds.

## Profiling and deployment

Read-only diagnostics track the set of live Pixi applications and count scene descendants. Texture counts use the public Assets cache and the known manifest; they intentionally remain warm across matches. The benchmark performs a warm-up before five GC-assisted lifecycle measurements. It then uses actual keyboard events, manual fixed steps and real Pixi rendering on requestAnimationFrame for a three-minute interval sample. Because default matches end at 120 seconds or death, the harness records/restarts matches instead of changing combat rules. Raw frame times and resource samples are committed alongside the report.

A small Vite build plugin copies the original `assets/` directory into `dist/assets/`; development serves those files from the project root. The MSW worker is copied from `public/`. This avoids deployment and Windows checkout dependence on filesystem symlinks. Vercel serves that output with a SPA rewrite and revalidation for the worker. The worker is not assigned immutable caching. No external backend is required. API payload shape guards keep a misconfigured host's HTML fallback from crashing the record UI.

## Memory management

Ownership follows the match. One `Game` effect creates the simulation, clock, input bindings, Pixi application and sprite pools, and the same effect's cleanup releases all of them. Nothing a match creates is stored in module scope except the registry of live renderers used for diagnostics, which removes its entry on destroy.

- Asynchronous `Application.init()` can finish after React has unmounted, which Strict Mode does on every development mount. A cancellation flag makes the late completion destroy itself, and `destroy()` is idempotent.
- `Application.destroy()` removes the canvas, ticker and scene children. Healthbar `Graphics` are destroyed with `context: true` so their owned geometry contexts go too. Pools drop their sprite references.
- Textures are shared, not owned by a match. Pixi `Assets` keeps all 36 decoded for the life of the page so a rematch starts instantly. When the last application exits, their GPU handles are unloaded; the next match re-uploads on first use.
- PixiJS 8.22's `GlBackBufferSystem` never destroys its blit shader, whose bind group stays subscribed to the global `Texture.WHITE` source. That retained one bind group and one listener per destroyed application. `PixiRenderer.destroy()` destroys the shader itself. This reads a private field, so it is guarded, and `Shader.destroy()` is idempotent in case the library fixes it.
- An E2E test plays four consecutive matches and requires zero applications, zero display objects, zero canvases, a constant texture cache and a constant listener count on Pixi's built-in textures. The last check is what would catch the back-buffer leak returning.

A rising JS heap was not treated as proof of a leak. Live instances were counted per class after forced GC, and the residual heap growth was attributed with a heap-snapshot diff. See [reports/performance.md](reports/performance.md).

## Performance decisions

- The simulation is plain arrays of plain objects with no allocation-heavy abstractions; a full step plus scene sync plus Pixi draw submission measures 0.43 ms per frame on the reference machine.
- The canvas backing matches the visible arena instead of the 1600 × 900 logical world, so the renderer never shades pixels the layout would scale away. A `ResizeObserver` keeps it in step; the scene container carries the scale.
- Water is one `TilingSprite` rather than 375 sprites. Multisample antialiasing is off because the art is raster sprites.
- Projectile and effect sprites are pooled per match. Healthbar geometry is rebuilt only when HP changes.
- React is kept out of the frame loop. The HUD store publishes at most every 100 ms of simulation time, plus immediately on HP, score or status changes.
- Rendering fewer pixels to raise the software-rasterizer figure was rejected: it would cost image quality everywhere to improve a number that only applies to machines without a GPU.

## Limitations and next steps

- Sampled obstacle steering is intentionally local; crowded shore approaches can produce detours. A grid pathfinder would improve routing but is not required for this arena.
- Ships use circular collision hulls for smooth sliding. Visible bows/sterns extend beyond that circle; the collider is deliberately smaller than the 96 px visual hull.
- Audio uses essential provided WAV effects; ambient loops and elaborate debris were cut before core mechanics. Splashes reuse a tinted effect texture.
- Water is static tiled art in both modes; effect/fire animation advances only with simulation time.
- The demo database is localStorage and is not atomic across independent browser tabs. Server authentication, authoritative validation and shared persistence are out of scope.
- If localStorage is denied/full, the app uses session memory; refresh durability then cannot be guaranteed. Corrupt JSON falls back safely.
- The backing canvas follows its visible CSS size through a ResizeObserver, while its scene scales the fixed logical world. Multisample antialiasing is disabled for raster art and the water uses one TilingSprite. The renderer's asset density is selected once per page load to avoid texture lookup changes when moving between monitors; resolution is capped at 2 per application.
- Native service workers and WebGL are required for the complete experience. Rendering initialization failures return an accessible menu action; asset failures offer Retry.
- Baselines target the locked Chromium build on Linux. Other OS font rendering can require reviewed baseline updates.
- The back-buffer leak workaround depends on a private Pixi field name. The E2E listener assertion will fail if a Pixi upgrade renames it without fixing the leak.
- Profiling covers one desktop machine in headless Chromium: 60 FPS on its GPU, about 27 FPS on the software rasterizer. No mobile device or mobile GPU memory was measured. GC-assisted cycle tests are evidence of teardown for the resources they count, not proof that no leak exists.
- Next steps, in order of value: a real backend with server-side score validation, profiling on physical phones, grid pathfinding for enemies, ambient audio and animated water.

## Five interview discussion points

1. A pure fixed-step simulation separates the game's time from browser frame rates; seeded randomness plus actual inputs enables reproducible tests.
2. Pixi owns continuous transforms, while a throttled external store publishes semantic HUD events to React without rendering React every frame.
3. Asynchronous initialization needs cancellation and idempotent destruction; per-match pools die with the scene while shared textures remain cached. A heap number alone does not identify a leak: counting live instances per class is what located the one real leak, inside Pixi's back-buffer system.
4. Record delivery uses an outbox before sending and an idempotent PUT key; this handles a committed request whose response was lost.
5. Query keys, cancellation signals, deterministic tie-breaking and configuration-specific rankings solve different consistency problems and are tested separately.
