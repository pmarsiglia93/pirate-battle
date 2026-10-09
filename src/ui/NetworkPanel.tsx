import { useState } from 'react';
import { queryClient } from '../api/client';
import {
  getScenario,
  setScenario,
  scenarios,
  type Scenario,
} from '../mocks/scenarios';
import { resetDb } from '../mocks/db';
import { resetPending } from '../persistence/pendingSubmissions';
export function NetworkPanel({ onRetry }: { onRetry: () => void }) {
  const [scenario, update] = useState(getScenario);
  return (
    <details className="network-panel">
      <summary>Network scenarios</summary>
      <label htmlFor="scenario">API scenario</label>
      <select
        id="scenario"
        value={scenario}
        onChange={(event) => {
          const value = event.target.value as Scenario;
          setScenario(value);
          update(value);
          void queryClient.invalidateQueries();
        }}
      >
        {scenarios.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <div>
        <button
          onClick={() => {
            resetDb();
            resetPending();
            queryClient.clear();
          }}
        >
          Reset mock data
        </button>
        <button onClick={onRetry}>Retry pending records</button>
      </div>
      <small>Local demo data. Scenarios never affect combat.</small>
    </details>
  );
}
