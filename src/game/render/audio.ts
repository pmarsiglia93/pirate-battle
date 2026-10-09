import type { GameEvent } from '../core/events';
import { read, write } from '../../persistence/storage';
const sounds: Partial<Record<GameEvent['kind'], string>> = {
  fire: 'cannon_fire_1',
  splash: 'cannonball_water_hit_1',
  hit: 'ship_wood_hit_1',
  damage: 'ship_collision',
  explosion: 'ship_explosion_1',
  end: 'game_complete',
};
let muted = read('muted', false);
let audioContext: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();
const active = new Set<AudioBufferSourceNode>();
export const isMuted = (): boolean => muted;
export function setMuted(value: boolean): void {
  muted = value;
  write('muted', value);
  if (value) for (const source of active) source.stop();
}
export function unlockAudio(): void {
  if (new URLSearchParams(location.search).has('test')) return;
  audioContext ??= new AudioContext();
  void audioContext.resume().catch(() => undefined);
  for (const name of Object.values(sounds))
    if (!buffers.has(name))
      void fetch(`/assets/sounds/${name}.wav`)
        .then((r) => r.arrayBuffer())
        .then((data) => audioContext!.decodeAudioData(data))
        .then((buffer) => buffers.set(name, buffer))
        .catch(() => undefined);
}
export function playEvents(events: GameEvent[]): void {
  if (muted || !audioContext || audioContext.state !== 'running') return;
  for (const kind of new Set(events.map((e) => e.kind))) {
    const name = sounds[kind],
      buffer = name ? buffers.get(name) : undefined;
    if (!buffer || active.size >= 12) continue;
    const source = audioContext.createBufferSource(),
      gain = audioContext.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.2;
    source.connect(gain).connect(audioContext.destination);
    active.add(source);
    source.onended = () => {
      active.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }
}
export function stopAudio(): void {
  for (const source of active) source.stop();
  active.clear();
}
