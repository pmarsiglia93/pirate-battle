# Release verification

The full verification below ran on 2026-10-10 (UTC) at commit `d81aac7`. Two feature commits followed: difficulty (`d22be24`) and captain name, ship choice, sprint and random spawn seed (`90b6a0f`). `90b6a0f` is the commit now deployed; later commits change documentation only. For it, the working-tree typecheck, lint, 29 unit tests, build and the full Playwright suite (58 passed, 4 skipped) were rerun and the live site was smoke-tested again. Three visual baselines were regenerated after review for the sprint indicator, legend entry and touch button. The clean-checkout, benchmark and memory runs were not repeated for these commits; the texture cache is now 48 entries instead of the 36 recorded in the performance report.

## Automated checks

| Check                  | Working tree           | Clean checkout       |
| ---------------------- | ---------------------- | -------------------- |
| `npm ci`               | —                      | Passed               |
| `npm run typecheck`    | Passed                 | Passed               |
| `npm run lint`         | Passed                 | Passed               |
| `npm test`             | 18 passed              | 18 passed            |
| `npm run build`        | Passed                 | Passed               |
| `npm run test:e2e`     | 54 passed, 2 skipped   | 54 passed, 2 skipped |
| `npm run memory`       | Passed, 30 cycles      | Not repeated         |
| `npm run perf`         | 26.83 FPS, p95 50.1 ms | Not repeated         |
| `npm run perf:gpu`     | 60.01 FPS, p95 16.7 ms | Not repeated         |
| `npm audit --omit=dev` | —                      | 0 vulnerabilities    |

No test failed. The two skipped cases are the multitouch and portrait-orientation tests, which target the mobile project and are skipped by design in the desktop project; both pass on mobile. The six visual baselines matched without being regenerated.

The clean checkout was an isolated `git worktree` of the commit with no `node_modules`, `dist` or untracked files, installed from the lockfile. Playwright started its own preview server there (`CI=1`), so it could not reuse a server from the original directory. Its build contained 493 PNG and 27 WAV assets plus `mockServiceWorker.js`, with no dependency on a filesystem symlink.

The benchmark and memory runs were not repeated in the clean checkout because they measure the same build output and take several minutes each.

## Deployment

- URL: <https://pirate-battle-jungle-gamma.vercel.app>
- Vercel project `pirate-battle-jungle`, production target, built by Vercel from the uploaded source with `npm run build`.
- The project already existed and had no deployments, so it was reused instead of creating a duplicate.

HTTP checks, unauthenticated:

| Path                                   | Result                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/`                                    | 200, HTML                                                                                         |
| `/some/deep/route`                     | 200, same HTML through the SPA rewrite                                                            |
| `/mockServiceWorker.js`                | 200, JavaScript, `Cache-Control: public, max-age=0, must-revalidate`, `Service-Worker-Allowed: /` |
| `/assets/png/default/ships/ship_2.png` | 200, `image/png`                                                                                  |
| `/assets/sounds/cannon_fire_1.wav`     | 200, `audio/wave`                                                                                 |
| `/assets/does-not-exist.png`           | 404, not rewritten to HTML                                                                        |

Browser smoke test against the live URL, Chromium 156:

- Menu renders; Ranking loads five fixture rows with pagination through the MSW worker, which registers and controls the page.
- A real-time match starts on the production ticker: arena, islands, both enemy types, healthbars and HUD render; the player takes damage.
- Pause freezes the timer, Resume restarts it, and exiting leaves zero canvases.
- Mobile landscape with touch input sails the ship; portrait shows the rotate notice.
- A completed match shows Battle complete, registers as Saved, survives a refresh and appears in Match History.
- After the `d22be24` redeploy: Options offers Easy, Normal and Hard; an Easy match starts with that difficulty in its configuration, completes and registers as Saved.
- After the `90b6a0f` redeploy: a captain name and ship saved in Options are used by the next match; Shift activates sprint and the HUD shows it; the finished match appears in Match History and in the Ranking under the new name; two different seeds spawn the first enemy in different places.
- No uncaught page errors, console errors, failed requests or HTTP errors in any of these flows.

## Not verified

- Physical phones or tablets; mobile coverage is Chromium device emulation.
- Browsers other than Chromium.
- Audio output; sound is muted in automated runs.
