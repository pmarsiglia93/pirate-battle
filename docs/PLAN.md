# Delivery plan

Estimate: two working days. Gameplay (35 points) and resource lifecycle (20 points) take priority.

- [x] Phase 1: scaffold, strict configuration, fixed clock, RNG, asset loading, menu and persistent options.
- [x] Phase 2: deterministic simulation, tile collision, weapons, AI, spawning, match lifecycle, Pixi renderer.
- [x] Phase 3: HUD, results, touch, audiovisual feedback, responsive layout and accessibility.
- [x] Phase 4: typed API, Axios, Query, persistent MSW, scenarios and durable submission queue.
- [x] Phase 5: deterministic Playwright coverage and committed visual baselines.
- [x] Phase 6: performance and memory measurements, documentation, deployment readiness and clean-checkout verification.
  - [x] Rendering optimizations: 9.17 → about 27–29 FPS on the software rasterizer; 60.01 FPS measured on the hardware GPU.
  - [x] Memory investigation closed: one real leak in Pixi's back-buffer teardown found, fixed and covered by an E2E test.
  - [x] Documentation and asset licensing.
  - [x] Clean-checkout verification from an isolated worktree with a fresh `npm ci`.
  - [x] Public deployment at <https://pirate-battle-jungle-gamma.vercel.app> and live smoke test.

Each phase must pass typecheck, lint and existing tests before its conventional commit. Results of the final validation are in [reports/verification.md](../reports/verification.md).
