import type { Simulation } from '../../game/core/simulation';
import { touchActions } from '../../game/input/touch';
export function TouchControls({ simulation }: { simulation: Simulation }) {
  return (
    <div className="touch-controls" aria-label="Touch controls">
      {touchActions.map(({ action, label, icon }) => (
        <button
          key={action}
          className={`touch-button touch-${action}`}
          aria-label={label}
          onPointerDown={(event) => {
            if (simulation.state.status !== 'running') return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            simulation.input[action] = true;
          }}
          onPointerUp={() => {
            simulation.input[action] = false;
          }}
          onPointerCancel={() => {
            simulation.input[action] = false;
          }}
          onLostPointerCapture={() => {
            simulation.input[action] = false;
          }}
        >
          {icon ? (
            <img
              draggable={false}
              src={`/assets/png/retina/ui/controls/icon_${icon}.png`}
              alt=""
            />
          ) : (
            <span aria-hidden="true">»</span>
          )}
        </button>
      ))}
    </div>
  );
}
