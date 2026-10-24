import { defineConfig } from 'tsup';

// Bundles the API (including the shared domain code) into a single ESM file
// so the production server only needs `node dist/server/index.js`.
export default defineConfig({
  entry: { 'server/index': 'server/index.ts' },
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  clean: false,
  sourcemap: true,
  tsconfig: 'tsconfig.json',
});
