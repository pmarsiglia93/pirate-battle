export type EventKind =
  | 'wreck'
  | 'fire'
  | 'splash'
  | 'hit'
  | 'explosion'
  | 'damage'
  | 'score'
  | 'pause'
  | 'end';
export interface GameEvent {
  kind: EventKind;
  sprite?: number;
  angle?: number;
  x: number;
  y: number;
}
export interface Effect extends GameEvent {
  id: number;
  life: number;
  maxLife: number;
}
