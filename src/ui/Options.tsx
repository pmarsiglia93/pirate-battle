import { useState } from 'react';
import {
  gameConfig,
  validOptions,
  type MatchOptions,
} from '../game/config/gameConfig';
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
        <button className="primary">Save</button>
        <button type="button" className="secondary" onClick={onBack}>
          Main Menu
        </button>
      </form>
    </section>
  );
}
