import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { compareMatches } from '../../src/api/contracts';
import { fixtures } from '../../src/mocks/fixtures';
let server: ReturnType<typeof setupServer>;
beforeAll(async () => {
  vi.stubGlobal('location', { search: '' });
  server = setupServer(...(await import('../../src/mocks/handlers')).handlers);
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});
describe('shared REST contracts', () => {
  it('returns 201 then 200 for the same match and never duplicates', async () => {
    const record = {
      ...fixtures(1)[0]!,
      matchId: 'idempotency-test',
      playerId: 'test-player',
    };
    const request = () =>
      fetch('http://localhost/api/matches/idempotency-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    expect((await request()).status).toBe(201);
    expect((await request()).status).toBe(200);
    const response = await fetch(
      'http://localhost/api/players/test-player/matches?page=1&pageSize=5',
    );
    const body = await response.json();
    expect(body.total).toBe(1);
    expect(body.items[0].matchId).toBe(record.matchId);
  });
  it('rejects malformed match data', async () => {
    const response = await fetch('http://localhost/api/matches/bad', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(400);
  });
  it('breaks ranking ties by duration, timestamp and match ID', () => {
    const base = fixtures(1)[0]!;
    const records = [
      { ...base, matchId: 'z', score: 10, durationMs: 4000 },
      { ...base, matchId: 'b', score: 10, durationMs: 3000 },
      { ...base, matchId: 'a', score: 10, durationMs: 3000 },
      { ...base, matchId: 'top', score: 11 },
    ];
    expect(records.sort(compareMatches).map((r) => r.matchId)).toEqual([
      'top',
      'a',
      'b',
      'z',
    ]);
  });
});
