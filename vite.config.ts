import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-game-assets',
      apply: 'build',
      closeBundle() {
        cpSync(
          fileURLToPath(new URL('./assets', import.meta.url)),
          fileURLToPath(new URL('./dist/assets', import.meta.url)),
          { recursive: true },
        );
      },
    },
  ],
  build: { chunkSizeWarningLimit: 1000 },
  server: { port: 5173 },
});
