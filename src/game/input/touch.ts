import type { InputState } from '../core/types';
export function worldPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / rect.width) * width,
    y: ((clientY - rect.top) / rect.height) * height,
  };
}
export const touchActions: {
  action: keyof InputState;
  label: string;
  icon: string | null;
}[] = [
  { action: 'left', label: 'Turn left', icon: 'turn_left' },
  { action: 'forward', label: 'Sail forward', icon: 'forward' },
  { action: 'right', label: 'Turn right', icon: 'turn_right' },
  { action: 'port', label: 'Fire port broadside', icon: 'fire_left' },
  { action: 'front', label: 'Fire front cannon', icon: 'fire_front' },
  {
    action: 'starboard',
    label: 'Fire starboard broadside',
    icon: 'fire_right',
  },
  // The art pack has no sprint icon, so this button renders a text glyph.
  { action: 'sprint', label: 'Sprint', icon: null },
];
