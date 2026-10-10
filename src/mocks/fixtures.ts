import { configKey, type MatchRecord } from '../api/contracts';
import { loadProfile } from '../persistence/profile';
export function fixtures(count = 18, localPlayer?: string): MatchRecord[] {
  const names = [
    'Captain Flint',
    'Red Sparrow',
    'Storm Rider',
    'Sea Wolf',
    'Anne Bonny',
    'Black Pearl',
    'Iron Tide',
    'Mary Read',
    'Silver Hook',
  ];
  return Array.from({ length: count }, (_, i) => {
    const config = { sessionTime: i % 4 === 3 ? 60 : 120, spawnTime: 4 };
    return {
      matchId: `fixture-${i.toString().padStart(3, '0')}`,
      playerId: localPlayer && i % 3 === 0 ? localPlayer : `crew-${i}`,
      playerName:
        localPlayer && i % 3 === 0
          ? loadProfile().name
          : names[i % names.length]!,
      createdAt: new Date(Date.UTC(2026, 9, 1, 12, i)).toISOString(),
      score: 38 - (i % 30),
      durationMs: config.sessionTime * 1000 - i * 100,
      endReason: 'time-up',
      config,
      configKey: configKey(config),
    };
  });
}
