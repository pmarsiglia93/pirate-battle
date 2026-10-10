import type { InputState } from '../core/types';
const mapping: Record<string, keyof InputState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'front',
  KeyQ: 'port',
  KeyE: 'starboard',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
};
export function bindKeyboard(
  getInput: () => InputState,
  active: () => boolean,
  pause: () => void,
): () => void {
  const held = new Set<string>();
  let lastInput = getInput();
  const handle = (event: KeyboardEvent) => {
    if (lastInput !== getInput()) {
      held.clear();
      lastInput = getInput();
    }
    if (
      !active() ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement
    )
      return;
    const down = event.type === 'keydown';
    if (down && (event.code === 'KeyP' || event.code === 'Escape')) {
      event.preventDefault();
      if (!event.repeat) pause();
      held.clear();
      return;
    }
    const action = mapping[event.code];
    if (!action) return;
    // Buttons keep their native Space/Enter activation when focused.
    if (event.target instanceof HTMLButtonElement && event.code === 'Space')
      return;
    event.preventDefault();
    if (down) held.add(event.code);
    else held.delete(event.code);
    getInput()[action] = Object.entries(mapping).some(
      ([key, value]) => value === action && held.has(key),
    );
  };
  window.addEventListener('keydown', handle);
  window.addEventListener('keyup', handle);
  return () => {
    held.clear();
    window.removeEventListener('keydown', handle);
    window.removeEventListener('keyup', handle);
  };
}
