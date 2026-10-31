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
    coverage: {
      provider: 'v8',
      include: ['shared/**/*.ts', 'server/**/*.ts', 'client/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/test-utils.ts',
        'client/src/test/**',
        'client/src/main.tsx',
        'server/index.ts',
      ],
      reporter: ['text-summary'],
      // A floor, not a goal: it stops the suite from quietly getting weaker.
      thresholds: { lines: 70, statements: 70, functions: 60, branches: 65 },
    },
  },
});
