# Delivery plan

Estimate: two working days. Gameplay (35 points) and resource lifecycle (20 points) take priority.

- [x] Phase 1: scaffold, strict configuration, fixed clock, RNG, asset loading, menu and persistent options.
- [x] Phase 2: deterministic simulation, tile collision, weapons, AI, spawning, match lifecycle, Pixi renderer.
- [x] Phase 3: HUD, results, touch, audiovisual feedback, responsive layout and accessibility.
- [ ] Phase 4: typed API, Axios, Query, persistent MSW, scenarios and durable submission queue.
- [ ] Phase 5: deterministic Playwright coverage and committed visual baselines.
- [ ] Phase 6: performance and memory measurements, documentation, deployment readiness and clean-checkout verification.

Each phase must pass typecheck, lint and existing tests before its conventional commit. Public deployment requires an authenticated Vercel account; if unavailable, provide the exact command.
