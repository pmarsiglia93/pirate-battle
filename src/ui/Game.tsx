import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MatchOptions } from '../game/config/gameConfig';
import { Simulation } from '../game/core/simulation';
import type { GameState } from '../game/core/types';
import { FixedClock } from '../game/core/clock';
import { resolveSeed, testMode } from '../game/core/testApi';
import { createGameStore } from '../game/bridge/gameStore';
import { bindKeyboard } from '../game/input/keyboard';
import { PixiRenderer, resourceSnapshot } from '../game/render/PixiRenderer';
import {
  isMuted,
  setMuted,
  playEvents,
  stopAudio,
  unlockAudio,
} from '../game/render/audio';
import { Controls } from './components/Controls';
import { PauseDialog } from './components/PauseDialog';
import { TouchControls } from './components/TouchControls';
import { formatTime } from './Result';
export function Game({
  options,
  ship,
  onExit,
  onFinish,
}: {
  options: MatchOptions;
  ship: number;
  onExit: () => void;
  onFinish: (state: GameState) => void;
}) {
  const [simulation] = useState(
    () =>
      new Simulation(
        options,
        resolveSeed(
          new URLSearchParams(location.search),
          () => crypto.getRandomValues(new Uint32Array(1))[0]!,
        ),
      ),
  );
  const [store] = useState(() => createGameStore(simulation));
  const hud = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [muted, updateMuted] = useState(isMuted);
  const clock = useRef<FixedClock | null>(null);
  const finished = useRef(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const pause = () => {
    simulation.pause();
    clock.current?.reset();
    store.publish(true);
  };
  const resume = () => {
    if (matchMedia('(pointer: coarse) and (orientation: portrait)').matches)
      return;
    simulation.resume();
    clock.current?.reset();
    store.publish(true);
    host.current?.focus();
    unlockAudio();
  };
  useEffect(() => {
    let cancelled = false;
    const renderer = new PixiRenderer(ship);
    const gameClock = new FixedClock((dt) => {
      simulation.step(dt);
      playEvents(simulation.events);
      store.publish();
      if (simulation.state.status === 'ended' && !finished.current) {
        finished.current = true;
        finishRef.current(simulation.snapshot());
      }
    });
    clock.current = gameClock;
    const stop = () => {
      simulation.pause();
      gameClock.reset();
      store.publish(true);
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    if (testMode()) window.__PIRATE_RESOURCES__ = resourceSnapshot;
    const orientation = () => {
      if (matchMedia('(pointer: coarse) and (orientation: portrait)').matches)
        stop();
    };
    window.addEventListener('resize', orientation);
    orientation();
    const unbind = bindKeyboard(
      () => simulation.input,
      () =>
        simulation.state.status === 'running' &&
        !document.querySelector('dialog[open]'),
      stop,
    );
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', visibility);
    void renderer
      .init(host.current!)
      .then(() => {
        if (cancelled) {
          renderer.destroy();
          return;
        }
        renderer.render(simulation.state);
        host.current?.focus();
        if (testMode())
          window.__PIRATE_TEST__ = {
            advance: (ms) => {
              if (simulation.state.status === 'running') gameClock.advance(ms);
              else gameClock.reset();
              renderer.render(simulation.state);
              if (simulation.state.status !== 'ended') renderer.app.render();
            },
            getState: () => simulation.snapshot(),
            setSeed: (seed) => {
              if (simulation.state.elapsed !== 0)
                throw new Error('Seed can only change before the first step');
              simulation.rng.setSeed(seed);
            },
            getResources: () => renderer.stats(),
          };
        if (testMode()) {
          renderer.app.stop();
          renderer.app.render();
          return;
        }
        renderer.app.ticker.add((ticker) => {
          if (!testMode() && simulation.state.status === 'running')
            gameClock.frame(ticker.elapsedMS);
          else if (simulation.state.status !== 'running') gameClock.reset();
          renderer.render(simulation.state);
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
        renderer.destroy();
      });
    return () => {
      cancelled = true;
      unbind();
      window.removeEventListener('blur', stop);
      window.removeEventListener('resize', orientation);
      document.removeEventListener('visibilitychange', visibility);
      gameClock.reset();
      stopAudio();
      renderer.destroy();
      if (testMode() && simulation.state.status !== 'ended')
        delete window.__PIRATE_TEST__;
    };
  }, [simulation, store, ship]);
  return (
    <div className="game-screen">
      <div className="hud">
        <span className="health-counter">♥ {hud.hp} / 100</span>
        <span>★ {hud.score}</span>
        <span>◷ {formatTime(hud.remaining)}</span>
        <span className={`sprint-status sprint-${hud.sprint}`}>
          » {hud.sprint === 'ready' ? 'Sprint' : hud.sprint}
        </span>
        <button
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          onClick={() => {
            setMuted(!muted);
            updateMuted(!muted);
            unlockAudio();
          }}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
        <button onClick={pause}>Pause</button>
      </div>
      <div className="arena-host" ref={host} tabIndex={-1} />
      <TouchControls simulation={simulation} />
      <Controls />
      <p className="sr-only" aria-live="polite">
        {hud.announcement}
      </p>
      <dl className="sr-only" aria-label="Battle status">
        <dt>Score</dt>
        <dd>{hud.score}</dd>
        <dt>Time remaining</dt>
        <dd>{hud.remaining}</dd>
        <dt>State</dt>
        <dd>{hud.status}</dd>
        <dt>Sprint</dt>
        <dd>{hud.sprint}</dd>
      </dl>
      {error && (
        <div className="overlay">
          <section className="panel">
            <p role="alert">Unable to start the renderer.</p>
            <button className="primary" onClick={onExit}>
              Main Menu
            </button>
          </section>
        </div>
      )}
      {hud.status === 'paused' && (
        <PauseDialog onResume={resume} onExit={onExit} />
      )}
      <div className="rotate-notice">
        <span>↻</span>
        <h1>Turn the tide</h1>
        <p>Rotate your device to landscape to play.</p>
        <button onClick={onExit}>Main Menu</button>
      </div>
    </div>
  );
}
