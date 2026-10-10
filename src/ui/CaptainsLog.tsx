import { useState } from 'react';
import { configKey, configLabel } from '../api/contracts';
import { useMatches } from '../api/queries';
import type { MatchOptions } from '../game/config/gameConfig';
import { playerId } from '../persistence/lastResult';
import { formatTime } from './Result';
export function CaptainsLog({
  initialTab,
  options,
  name,
  onBack,
}: {
  initialTab: 'ranking' | 'history';
  options: MatchOptions;
  name: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState(initialTab),
    [page, setPage] = useState(1),
    [key, setKey] = useState(configKey(options));
  const id = playerId();
  const query = useMatches(tab, page, key, id);
  const selectTab = (value: 'ranking' | 'history') => {
    setTab(value);
    setPage(1);
  };
  return (
    <section className="panel log">
      <h1>Captain’s log</h1>
      <div className="tabs" role="tablist" aria-label="Battle records">
        {(['ranking', 'history'] as const).map((value) => (
          <button
            key={value}
            id={`tab-${value}`}
            role="tab"
            aria-selected={tab === value}
            aria-controls="records-panel"
            tabIndex={tab === value ? 0 : -1}
            className={tab === value ? 'primary' : 'secondary'}
            onClick={() => selectTab(value)}
            onKeyDown={(event) => {
              if (
                ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 'ranking'
                    : event.key === 'End'
                      ? 'history'
                      : tab === 'ranking'
                        ? 'history'
                        : 'ranking';
                selectTab(next);
                document.getElementById(`tab-${next}`)?.focus();
              }
            }}
          >
            {value === 'ranking' ? 'Ranking' : 'Match History'}
          </button>
        ))}
      </div>
      <div className="log-description">
        {tab === 'ranking' ? (
          <label>
            Battle configuration{' '}
            <select
              aria-label="Battle configuration"
              value={key}
              onChange={(event) => {
                setKey(event.target.value);
                setPage(1);
              }}
            >
              {[
                ...new Set([
                  configKey(options),
                  '120s-4s',
                  '60s-4s',
                  '180s-4s',
                ]),
              ].map((value) => (
                <option key={value} value={value}>
                  {configLabel(value)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>{name.toUpperCase()} · YOUR RECENT BATTLES</p>
        )}
      </div>
      <div
        role="tabpanel"
        id="records-panel"
        aria-labelledby={`tab-${tab}`}
        aria-busy={query.isFetching}
      >
        <div className="query-status" role="status">
          {query.isPending
            ? 'Loading records…'
            : query.isFetching
              ? 'Updating records…'
              : ''}
        </div>
        {query.isError ? (
          <div className="query-error">
            <p role="alert">
              Unable to load {tab === 'ranking' ? 'ranking' : 'match history'}.
            </p>
            <button onClick={() => void query.refetch()}>Retry</button>
          </div>
        ) : query.data?.items.length === 0 ? (
          <p className="empty-state">
            No battles recorded yet. Your legend starts at sea.
          </p>
        ) : (
          query.data && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {(tab === 'ranking'
                      ? ['Rank', 'Captain', 'Points', 'Played']
                      : ['Date', 'Points', 'Duration', 'Result']
                    ).map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((record, index) => (
                    <tr
                      key={record.matchId}
                      className={record.playerId === id ? 'you' : ''}
                    >
                      {tab === 'ranking' ? (
                        <>
                          <td>
                            {String(
                              (query.data.page - 1) * query.data.pageSize +
                                index +
                                1,
                            ).padStart(2, '0')}
                          </td>
                          <td>
                            {record.playerName}
                            {record.playerId === id && (
                              <span className="you-badge">YOU</span>
                            )}
                          </td>
                          <td>{record.score}</td>
                          <td>
                            {new Date(record.createdAt).toLocaleString(
                              'en-GB',
                              {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'UTC',
                              },
                            )}{' '}
                            UTC
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            {new Date(record.createdAt).toLocaleString(
                              'en-GB',
                              {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'UTC',
                              },
                            )}{' '}
                            UTC
                          </td>
                          <td>{record.score}</td>
                          <td>{formatTime(record.durationMs / 1000)}</td>
                          <td>
                            {record.endReason === 'time-up'
                              ? 'Time up'
                              : 'Destroyed'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
      <nav className="pagination" aria-label="Record pages">
        <button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          ←
        </button>
        <span>
          Page {page} of {query.data?.totalPages ?? 1}
        </span>
        <button
          aria-label="Next page"
          disabled={!query.data || page >= query.data.totalPages}
          onClick={() => setPage((value) => value + 1)}
        >
          →
        </button>
      </nav>
      <button className="primary" onClick={onBack}>
        Main Menu
      </button>
    </section>
  );
}
