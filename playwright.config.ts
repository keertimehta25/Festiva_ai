import { defineConfig } from '@playwright/test';

const SUPABASE_ENV = 'VITE_SUPABASE_URL=https://e2e.supabase.test VITE_SUPABASE_ANON_KEY=e2e-anon-key';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:4173',
    // Set PW_CHROMIUM_PATH when a browser is pre-installed outside Playwright's own cache.
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npx tsx e2e/server.ts',
      url: 'http://localhost:8787/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // The client is built with fake Supabase settings; the session is seeded by the tests.
      command: `${SUPABASE_ENV} npx vite build --config client/vite.config.ts --outDir ../dist/e2e && npx vite preview --config client/vite.config.ts --outDir ../dist/e2e --port 4173 --strictPort`,
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
