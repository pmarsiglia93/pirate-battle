# Architecture

## Decisions

Use npm with a committed lockfile, Vite, React Strict Mode and PixiJS v8. The simulation is pure TypeScript. All balance numbers live in one configuration; each match copies its options. The logical arena is 1600 × 900, with 64 px solid tiles and circle hulls. Axis-separated movement slides along solid cells.

Assets were inspected before implementation. Ship families have intact, lightly damaged, heavily damaged and sunk variants: pirate 2/8/14/20, red 3/9/15/21, blue 5/11/17/23. Sprites point upward; render rotation adds π/2 to mathematical headings. UI atlas border and layout metadata remain in 1× logical units, including the retina atlas. Individual PNGs avoid atlas cropping ambiguity. Water is tile 73; shore tiles 1/2/3/17/18/19/33/34/35 surround grass and palms.

Spawn limits are 1.5–15 seconds, retaining the requested 4 second default. No balance changes yet. Seeded randomness is independent from the frame rate.

See docs/PLAN.md for delivery status. Detailed lifecycle, network and validation notes will be completed alongside their implementations.

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
