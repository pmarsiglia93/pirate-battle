import { http, HttpResponse, delay } from 'msw';
import {
  compareMatches,
  configKey,
  type MatchRecord,
  type Page,
} from '../api/contracts';
import { validOptions } from '../game/config/gameConfig';
import { getScenario, latency } from './scenarios';
import { records, putRecord } from './db';
import { read, write } from '../persistence/storage';
const timeout = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 2500;
async function failure(
  resource: 'ranking' | 'history' | 'register',
  page = 1,
): Promise<Response | null> {
  const scenario = getScenario();
  await delay(latency(page));
  if (scenario === 'timeout') {
    await delay(timeout + 1000);
    return HttpResponse.json({ message: 'Timed out' }, { status: 504 });
  }
  if (scenario === 'network-error') return HttpResponse.error();
  if (scenario === 'http-4xx')
    return HttpResponse.json({ message: 'Request rejected' }, { status: 400 });
  if (scenario === 'http-5xx' || scenario === `${resource}-fails`)
    return HttpResponse.json(
      { message: 'Service unavailable' },
      { status: 503 },
    );
  if (scenario === 'offline-then-recover' && resource === 'register') {
    const attempts = read('offlineAttempts', 0);
    write('offlineAttempts', attempts + 1);
    if (attempts < 3) return HttpResponse.error();
  }
  return null;
}
function paginate(items: MatchRecord[], url: URL): Page<MatchRecord> {
  const page = Math.max(
      1,
      Math.floor(Number(url.searchParams.get('page')) || 1),
    ),
    pageSize = Math.min(
      50,
      Math.max(1, Math.floor(Number(url.searchParams.get('pageSize')) || 5)),
    );
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}
function validRecord(value: unknown): value is MatchRecord {
  if (!value || typeof value !== 'object') return false;
  const r = value as MatchRecord;
  return (
    typeof r.matchId === 'string' &&
    typeof r.playerId === 'string' &&
    typeof r.playerName === 'string' &&
    typeof r.createdAt === 'string' &&
    Number.isFinite(Date.parse(r.createdAt)) &&
    Number.isInteger(r.score) &&
    r.score >= 0 &&
    Number.isFinite(r.durationMs) &&
    r.durationMs >= 0 &&
    ['time-up', 'destroyed'].includes(r.endReason) &&
    !!r.config &&
    validOptions(r.config) &&
    r.configKey === configKey(r.config)
  );
}
export const handlers = [
  http.get('*/api/ranking', async ({ request }) => {
    const url = new URL(request.url);
    const error = await failure(
      'ranking',
      Number(url.searchParams.get('page')),
    );
    if (error) return error;
    const items =
      getScenario() === 'empty'
        ? []
        : records()
            .filter((r) => r.configKey === url.searchParams.get('configKey'))
            .sort(compareMatches);
    return HttpResponse.json(paginate(items, url));
  }),
  http.get('*/api/players/:playerId/matches', async ({ params, request }) => {
    const url = new URL(request.url);
    const error = await failure(
      'history',
      Number(url.searchParams.get('page')),
    );
    if (error) return error;
    const items =
      getScenario() === 'empty'
        ? []
        : records()
            .filter((r) => r.playerId === params.playerId)
            .sort(
              (a, b) =>
                b.createdAt.localeCompare(a.createdAt) ||
                a.matchId.localeCompare(b.matchId),
            );
    return HttpResponse.json(paginate(items, url));
  }),
  http.put('*/api/matches/:matchId', async ({ params, request }) => {
    const error = await failure('register');
    if (error) return error;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    if (!validRecord(body) || body.matchId !== params.matchId)
      return HttpResponse.json({ message: 'Invalid match' }, { status: 400 });
    const result = putRecord(body);
    if (getScenario() === 'register-timeout-after-commit' && result.created)
      await delay(timeout + 1000);
    return HttpResponse.json(result.record, {
      status: result.created ? 201 : 200,
    });
  }),
];
