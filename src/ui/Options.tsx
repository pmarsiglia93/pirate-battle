import { useState } from 'react';
import {
  difficultyOf,
  gameConfig,
  validOptions,
  type Difficulty,
  type MatchOptions,
} from '../game/config/gameConfig';
const difficultyHelp: Record<Difficulty, string> = {
  easy: 'Enemies are slower and deal half damage.',
  normal: 'The standard battle.',
  hard: 'Enemies are faster and deal 50% more damage.',
};
export function Options({
  options,
  onSave,
  onBack,
}: {
  options: MatchOptions;
  onSave: (options: MatchOptions) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(options);
  const [submitted, setSubmitted] = useState(false);
  const fields = [
    {
      key: 'sessionTime',
      label: 'Game session time',
      min: gameConfig.limits.sessionMin,
      max: gameConfig.limits.sessionMax,
      step: 1,
    },
    {
      key: 'spawnTime',
      label: 'Enemy spawn time',
      min: gameConfig.limits.spawnMin,
      max: gameConfig.limits.spawnMax,
      step: 0.5,
    },
  ] as const;
  return (
    <section className="panel options">
      <h1>Options</h1>
      <p>Chart your next battle.</p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (validOptions(draft)) onSave(draft);
        }}
      >
        {fields.map((field) => {
          const invalid =
            !Number.isFinite(draft[field.key]) ||
            draft[field.key] < field.min ||
            draft[field.key] > field.max;
          return (
            <div className="field" key={field.key}>
              <label htmlFor={field.key}>{field.label}</label>
              <div className="number-row">
                <input
                  id={field.key}
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={Number.isNaN(draft[field.key]) ? '' : draft[field.key]}
                  aria-invalid={submitted && invalid}
                  aria-describedby={`${field.key}-help`}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [field.key]: event.target.valueAsNumber,
                    })
                  }
                />
                <span>seconds</span>
              </div>
              <small
                id={`${field.key}-help`}
                className={submitted && invalid ? 'error' : ''}
              >
                {field.min}–{field.max} seconds
                {submitted && invalid ? ' — enter a valid value.' : ''}
              </small>
            </div>
          );
        })}
        <div className="field">
          <label htmlFor="difficulty">Difficulty</label>
          <select
            id="difficulty"
            value={difficultyOf(draft)}
            aria-describedby="difficulty-help"
            onChange={(event) =>
              setDraft({
                ...draft,
                difficulty: event.target.value as Difficulty,
              })
            }
          >
            {(Object.keys(gameConfig.difficulty) as Difficulty[]).map(
              (value) => (
                <option key={value} value={value}>
                  {gameConfig.difficulty[value].label}
                </option>
              ),
            )}
          </select>
          <small id="difficulty-help">
            {difficultyHelp[difficultyOf(draft)]}
          </small>
        </div>
        <button className="primary">Save</button>
        <button type="button" className="secondary" onClick={onBack}>
          Main Menu
        </button>
      </form>
    </section>
  );
}
