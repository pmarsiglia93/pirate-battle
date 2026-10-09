import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
export const client = axios.create({
  baseURL: '/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 2500,
});
export const retryable = (error: unknown): boolean =>
  axios.isAxiosError(error) &&
  !axios.isCancel(error) &&
  (!error.response || error.response.status >= 500);
export const retry = (count: number, error: unknown): boolean =>
  count < 2 && retryable(error);
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry,
      retryDelay: (attempt) => Math.min(300 * 2 ** attempt, 2000),
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
    mutations: { retry, retryDelay: (attempt) => 300 * 2 ** attempt },
  },
});
