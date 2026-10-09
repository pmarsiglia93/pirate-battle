import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useMutation } from '@tanstack/react-query';
import { client, queryClient, retryable } from './client';
import type { MatchRecord } from './contracts';
import {
  acknowledge,
  enqueue,
  pendingRecords,
  setSubmissionStatus,
  submissionSnapshot,
  subscribeSubmissions,
} from '../persistence/pendingSubmissions';
const inFlight = new Map<string, Promise<MatchRecord>>();
async function register(record: MatchRecord): Promise<MatchRecord> {
  let promise = inFlight.get(record.matchId);
  if (!promise) {
    promise = client
      .put<MatchRecord>(`/matches/${record.matchId}`, record)
      .then((response) => {
        if (response.data?.matchId !== record.matchId)
          throw new Error('Invalid registration response');
        return response.data;
      });
    inFlight.set(record.matchId, promise);
  }
  try {
    return await promise;
  } finally {
    inFlight.delete(record.matchId);
  }
}
export function useSubmissions() {
  const statuses = useSyncExternalStore(
    subscribeSubmissions,
    submissionSnapshot,
  );
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (record) => {
      acknowledge(record.matchId);
      void queryClient.invalidateQueries({ queryKey: ['ranking'] });
      void queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error, record) =>
      setSubmissionStatus(
        record.matchId,
        retryable(error) ? 'Pending' : 'Failed',
      ),
  });
  const send = useRef(mutation.mutate);
  send.current = mutation.mutate;
  useEffect(() => {
    for (const record of pendingRecords()) {
      setSubmissionStatus(record.matchId, 'Saving');
      send.current(record);
    }
  }, []);
  return {
    statuses,
    submit: (record: MatchRecord) => {
      if (submissionSnapshot()[record.matchId] === 'Saving') return;
      enqueue(record);
      send.current(record);
    },
    retry: () => {
      for (const record of pendingRecords())
        if (submissionSnapshot()[record.matchId] !== 'Saving') {
          setSubmissionStatus(record.matchId, 'Saving');
          send.current(record);
        }
    },
  };
}
