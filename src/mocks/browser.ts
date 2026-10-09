import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
export async function startMocks(): Promise<boolean> {
  try {
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
    return true;
  } catch {
    return false;
  }
}
