import type { MatchRecord } from '../api/contracts';
export const formatTime = (seconds: number): string =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
export function Result({
  record,
  onPlay,
  onMenu,
  status = 'Saved locally',
  onRetry,
}: {
  record: MatchRecord;
  onPlay: () => void;
  onMenu: () => void;
  status?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="panel result">
      <p className="eyebrow">Captain’s log</p>
      <h1>Battle complete</h1>
      <div className="result-score">{record.score}</div>
      <p>
        POINTS · {formatTime(record.durationMs / 1000)} ·{' '}
        {record.endReason === 'time-up' ? 'TIME UP' : 'DESTROYED'}
      </p>
      <p role="status" className="registration">
        {status}
      </p>
      {onRetry && <button onClick={onRetry}>Retry</button>}
      <button className="primary" onClick={onPlay}>
        Play Again
      </button>
      <button className="primary" onClick={onMenu}>
        Main Menu
      </button>
    </section>
  );
}
