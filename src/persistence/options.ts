import {
  defaultOptions,
  validOptions,
  type MatchOptions,
} from '../game/config/gameConfig';
import { read, write } from './storage';
export function loadOptions(): MatchOptions {
  const value = read('options', defaultOptions);
  return validOptions(value) ? value : { ...defaultOptions };
}
export function saveOptions(options: MatchOptions): void {
  write('options', options);
}
