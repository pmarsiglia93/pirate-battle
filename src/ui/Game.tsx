import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MatchOptions } from '../game/config/gameConfig';
import { Simulation } from '../game/core/simulation';
import { FixedClock } from '../game/core/clock';
import { createGameStore } from '../game/bridge/gameStore';
import { bindKeyboard } from '../game/input/keyboard';
import { PixiRenderer } from '../game/render/PixiRenderer';
import { Controls } from './components/Controls';
export function Game({
  options,
  onExit,
}: {
  options: MatchOptions;
  onExit: () => void;
}) {
  const [simulation] = useState(
    () =>
      new Simulation(
        options,
        Number(new URLSearchParams(location.search).get('seed') ?? 42),
      ),
  );
  const [store] = useState(() => createGameStore(simulation));
  const hud = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const clock = useRef<FixedClock | null>(null);
  const pause = () => {
    simulation.pause();
    clock.current?.reset();
    store.publish(true);
  };
  useEffect(() => {
    let cancelled = false;
    const renderer = new PixiRenderer();
    const gameClock = new FixedClock((dt) => {
      simulation.step(dt);
      store.publish();
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
    const unbind = bindKeyboard(
      () => simulation.input,
      () => simulation.state.status === 'running',
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
        renderer.app.ticker.add((ticker) => {
          if (simulation.state.status === 'running')
            gameClock.frame(ticker.elapsedMS);
          else gameClock.reset();
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
      document.removeEventListener('visibilitychange', visibility);
      gameClock.reset();
      renderer.destroy();
    };
  }, [simulation, store]);
  return (
    <div className="game-screen">
      <div className="hud">
        <span>♥ {hud.hp} / 100</span>
        <span>★ {hud.score}</span>
        <span>◷ {hud.remaining}s</span>
        <button onClick={pause}>Pause</button>
      </div>
      <div className="arena-host" ref={host} />
      <Controls />
      <p className="sr-only" aria-live="polite">
        {hud.announcement}
      </p>
      {error && (
        <p role="alert">
          Unable to start the renderer.{' '}
          <button onClick={onExit}>Main Menu</button>
        </p>
      )}
      {hud.status !== 'running' && (
        <div className="overlay">
          <section className="panel">
            <h1>{hud.status === 'paused' ? 'Paused' : 'Battle complete'}</h1>
            <p>Score: {hud.score}</p>
            {hud.status === 'paused' && (
              <button
                className="primary"
                onClick={() => {
                  simulation.resume();
                  clock.current?.reset();
                  store.publish(true);
                }}
              >
                Resume
              </button>
            )}
            <button className="primary" onClick={onExit}>
              Main Menu
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
