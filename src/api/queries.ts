import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { client } from './client';
import type { MatchRecord, Page } from './contracts';
export function useMatches(
  tab: 'ranking' | 'history',
  page: number,
  configKey: string,
  playerId: string,
) {
  return useQuery({
    queryKey:
      tab === 'ranking'
        ? ['ranking', configKey, page]
        : ['history', playerId, page],
    queryFn: async ({ signal }) =>
      (
        await client.get<Page<MatchRecord>>(
          tab === 'ranking' ? '/ranking' : `/players/${playerId}/matches`,
          { signal, params: { configKey, page, pageSize: 5 } },
        )
      ).data,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}
