import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Read VITE_* variables from the repository-root .env file (server secrets have no VITE_ prefix, so they are never exposed).
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Locally, /api is forwarded to the Express server so VITE_API_URL can stay empty.
    proxy: { '/api': 'http://localhost:8787' },
  },
  // `vite preview` (used by the browser tests) forwards /api the same way as the dev server.
  preview: { proxy: { '/api': 'http://localhost:8787' } },
  build: {
    outDir: fileURLToPath(new URL('../dist/client', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
});
