import { useSubmissions } from '../api/mutations';
import { CaptainsLog } from './CaptainsLog';
import { NetworkPanel } from './NetworkPanel';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadOptions, saveOptions } from '../persistence/options';
import {
  loadLastResult,
  saveLastResult,
  playerId,
} from '../persistence/lastResult';
import { configKey, type MatchRecord } from '../api/contracts';
import { loadProfile, saveProfile } from '../persistence/profile';
import type { GameState } from '../game/core/types';
import { loadAssets } from '../game/render/assets';
import { unlockAudio } from '../game/render/audio';
import { Options } from './Options';
import { Game } from './Game';
import { Result } from './Result';
import { Controls } from './components/Controls';
export function App() {
  const submissions = useSubmissions();
  const submitRef = useRef(submissions.submit);
  submitRef.current = submissions.submit;
  const [result, setResult] = useState(loadLastResult);
  const [screen, setScreen] = useState(() =>
    loadLastResult() ? 'result' : 'menu',
  );
  const [options, setOptions] = useState(loadOptions);
  const [profile, setProfile] = useState(loadProfile);
  const nameRef = useRef(profile.name);
  nameRef.current = profile.name;
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const attempt = useRef(0);
  const matchId = useRef('');
  useEffect(
    () => () => {
      attempt.current++;
    },
    [],
  );
  const play = async () => {
    unlockAudio();
    const token = ++attempt.current;
    setScreen('loading');
    setError(false);
    setProgress(0);
    try {
      await loadAssets((value) => {
        if (token === attempt.current) setProgress(value);
      });
      if (token !== attempt.current) return;
      matchId.current = crypto.randomUUID();
      setScreen('game');
    } catch {
      if (token === attempt.current) setError(true);
    }
  };
  const menu = () => {
    attempt.current++;
    setScreen('menu');
  };
  const finish = useCallback((state: GameState) => {
    const record: MatchRecord = {
      matchId: matchId.current,
      playerId: playerId(),
      playerName: nameRef.current,
      createdAt: new Date().toISOString(),
      score: state.score,
      durationMs: Math.round(state.elapsed * 1000),
      endReason: state.endReason!,
      config: { ...state.config },
      configKey: configKey(state.config),
    };
    saveLastResult(record);
    submitRef.current(record);
    setResult(record);
    setScreen('result');
  }, []);
  if (screen === 'game')
    return (
      <Game
        key={matchId.current}
        options={options}
        ship={profile.ship}
        onExit={menu}
        onFinish={finish}
      />
    );
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
            src={`/assets/png/retina/ships/ship_${profile.ship}.png`}
            alt=""
          />
          <p>Navigate the islands. Survive the battle.</p>
          <Controls />
          <div className="menu-tabs">
            <button className="secondary" onClick={() => setScreen('ranking')}>
              Ranking
            </button>
            <button className="secondary" onClick={() => setScreen('history')}>
              Match History
            </button>
          </div>
          <NetworkPanel onRetry={submissions.retry} />
        </section>
      ) : screen === 'ranking' || screen === 'history' ? (
        <CaptainsLog
          initialTab={screen}
          options={options}
          name={profile.name}
          onBack={menu}
        />
      ) : screen === 'options' ? (
        <Options
          options={options}
          profile={profile}
          onSave={(value, captain) => {
            saveOptions(value);
            setOptions(value);
            saveProfile(captain);
            setProfile(captain);
            setScreen('menu');
          }}
          onBack={menu}
        />
      ) : screen === 'result' && result ? (
        <Result
          record={result}
          status={submissions.statuses[result.matchId] ?? 'Saved'}
          onRetry={
            ['Pending', 'Failed'].includes(
              submissions.statuses[result.matchId] ?? '',
            )
              ? submissions.retry
              : undefined
          }
          onPlay={() => void play()}
          onMenu={menu}
        />
      ) : (
        <section className="panel">
          <h1>Preparing your ship</h1>
          {error ? (
            <>
              <p role="alert">
                Unable to load the game assets. Check your connection.
              </p>
              <button className="primary" onClick={() => void play()}>
                Retry
              </button>
            </>
          ) : (
            <>
              <progress max={1} value={progress} aria-label="Loading assets" />
              <p>{Math.round(progress * 100)}%</p>
            </>
          )}
          <button className="secondary" onClick={menu}>
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
