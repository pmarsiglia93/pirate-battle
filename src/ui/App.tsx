import { Game } from './Game';
import { useState } from 'react';
import { loadOptions, saveOptions } from '../persistence/options';
import { loadAssets } from '../game/render/assets';
import { Options } from './Options';
import { Controls } from './components/Controls';
export function App() {
  const [screen, setScreen] = useState('menu');
  const [options, setOptions] = useState(loadOptions);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const play = async () => {
    setScreen('loading');
    setError(false);
    try {
      await loadAssets(setProgress);
      setScreen('ready');
    } catch {
      setError(true);
    }
  };
  if (screen === 'ready')
    return <Game options={options} onExit={() => setScreen('menu')} />;
  return (
    <main className="shell">
      {screen === 'menu' ? (
        <section className="panel menu">
          <img
            className="title"
            src="/assets/png/retina/ui/menu/title_pirate_battle.png"
            alt="Pirate Battle"
          />
          <p className="eyebrow">Set sail. Take command.</p>
          <button className="primary" onClick={() => void play()}>
            Play
          </button>
          <button className="primary" onClick={() => setScreen('options')}>
            Options
          </button>
          <img
            className="mascot"
            src="/assets/png/retina/ships/ship_2.png"
            alt=""
          />
          <p>Navigate the islands. Survive the battle.</p>
          <Controls />
        </section>
      ) : screen === 'options' ? (
        <Options
          options={options}
          onSave={(value) => {
            saveOptions(value);
            setOptions(value);
            setScreen('menu');
          }}
          onBack={() => setScreen('menu')}
        />
      ) : (
        <section className="panel">
          <h1>
            {screen === 'ready' ? 'Ready to sail' : 'Preparing your ship'}
          </h1>
          {error ? (
            <>
              <p role="alert">
                Unable to load the game assets. Check your connection.
              </p>
              <button onClick={() => void play()}>Retry</button>
            </>
          ) : (
            <>
              <progress max={1} value={progress} aria-label="Loading assets" />
              <p>{Math.round(progress * 100)}%</p>
            </>
          )}
          <button className="primary" onClick={() => setScreen('menu')}>
            Main Menu
          </button>
        </section>
      )}
      <footer>
        PIRATE BATTLE <span>Jungle Gaming challenge</span>
      </footer>
    </main>
  );
}
