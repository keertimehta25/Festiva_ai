import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  test: {
    // Server and shared tests run in Node; client tests opt in to jsdom with a docblock.
    environment: 'node',
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'client/**/*.test.{ts,tsx}'],
    setupFiles: ['./client/src/test/setup.ts'],
    restoreMocks: true,
  },
});
