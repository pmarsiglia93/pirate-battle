import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/client';
import { startMocks } from './mocks/browser';
import { App } from './ui/App';
import './ui/styles.css';
void startMocks().then((ready) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
        {!ready && (
          <p className="network-warning" role="status">
            Demo API unavailable. Battles and options remain available.
          </p>
        )}
      </QueryClientProvider>
    </StrictMode>,
  );
});
