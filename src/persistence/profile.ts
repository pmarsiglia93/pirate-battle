import { read, write } from './storage';
// Ship families in the art pack: n is intact, n+6 and n+12 are damaged and
// n+18 is the wreck. Red (3) and blue (5) are reserved for the enemies.
export const shipChoices = [
  { id: 2, label: 'Black Flag' },
  { id: 1, label: 'White Sail' },
  { id: 4, label: 'Green Blades' },
  { id: 6, label: 'Gold Cross' },
] as const;
export type PlayerShip = (typeof shipChoices)[number]['id'];
export interface Profile {
  name: string;
  ship: PlayerShip;
}
export const nameLimits = { min: 3, max: 16 } as const;
export const defaultProfile: Profile = { name: 'Captain Jack', ship: 2 };
export const validName = (name: unknown): name is string =>
  typeof name === 'string' &&
  name.trim().length >= nameLimits.min &&
  name.trim().length <= nameLimits.max;
export const validShip = (ship: unknown): ship is PlayerShip =>
  shipChoices.some((choice) => choice.id === ship);
export function loadProfile(): Profile {
  const value = read<Partial<Profile> | null>('profile', null);
  return {
    name: validName(value?.name) ? value.name.trim() : defaultProfile.name,
    ship: validShip(value?.ship) ? value.ship : defaultProfile.ship,
  };
}
export function saveProfile(profile: Profile): void {
  write('profile', { name: profile.name.trim(), ship: profile.ship });
}
