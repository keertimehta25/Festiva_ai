/**
 * Test-only API server for the browser tests. It runs the REAL Express app, routes and validation;
 * only the three external providers are replaced: an in-memory database, a fixed-token auth
 * check and a canned AI answer. Nothing here ships to production.
 */
import { makeAiPlan } from '../shared/test-utils';
import type { AiService } from '../server/ai/aiService';
import { createApp } from '../server/app';
import { createMemoryRepository } from '../server/data/memoryRepository';
import { silentLogger } from '../server/logger';

export const E2E_TOKEN = 'e2e-token';
const user = { id: '33333333-3333-4333-8333-333333333333', email: 'e2e@example.test' };

const ai: AiService = {
  isConfigured: true,
  generatePlan: async () => makeAiPlan({ concept: { title: 'Heritage garden wedding', summary: 'A warm, family-first celebration with marigold and ivory accents.', themeIdeas: ['Marigold arches', 'Brass diyas'] } }),
  chat: async ({ message }) => ({
    reply: `Here is a suggestion based on your question: "${message.slice(0, 60)}". Book your entertainment early.`,
    proposals: [{ type: 'add_task', summary: 'Add a task to book the DJ', task: { title: 'Book the DJ', description: 'Confirm the playlist', category: 'entertainment', priority: 'high', dueDate: null } }],
  }),
  suggestSavings: async () => ({ ideas: [{ title: 'Use seasonal flowers', detail: 'Seasonal blooms usually cost less than imported ones.', category: 'decoration' }] }),
};

const app = createApp({
  config: { env: 'test', port: 8787, corsOrigins: [], trustProxy: 0, timeZone: 'Asia/Kolkata', supabaseUrl: 'https://e2e.supabase.test', supabaseServiceRoleKey: 'e2e-not-a-real-key-000000', gemini: { apiKey: 'e2e', model: 'e2e-canned-model', timeoutMs: 5000, thinkingLevel: undefined } },
  repo: createMemoryRepository(),
  ai,
  auth: { verify: async (token) => (token === E2E_TOKEN ? user : null) },
  logger: silentLogger,
  limits: { api: 10_000, ai: 1_000 },
});

app.listen(8787, () => console.info('e2e API on 8787'));
