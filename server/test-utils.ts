import { vi } from 'vitest';
import request from 'supertest';
import { makeAiPlan } from '@shared/test-utils';
import type { AiService } from './ai/aiService';
import { createApp } from './app';
import type { AuthUser, AuthVerifier } from './auth/verifier';
import type { AppConfig } from './config';
import { createMemoryRepository } from './data/memoryRepository';
import { silentLogger } from './logger';

export const ALICE: AuthUser = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@example.test' };
export const BOB: AuthUser = { id: '22222222-2222-4222-8222-222222222222', email: 'bob@example.test' };

export const TOKENS: Record<string, AuthUser> = { 'token-alice': ALICE, 'token-bob': BOB };

export const testConfig: AppConfig = {
  env: 'test',
  port: 0,
  corsOrigins: ['https://festiva.example.test'],
  trustProxy: 0,
  timeZone: 'Asia/Kolkata',
  supabaseUrl: 'https://example.supabase.test',
  supabaseServiceRoleKey: 'test-service-role-key-not-real',
  gemini: { apiKey: 'test-gemini-key-not-real', model: 'test-model', timeoutMs: 5000, thinkingLevel: undefined },
};

/** 22 Oct 2026, 10:00 in India. */
export const FIXED_NOW = new Date('2026-10-22T04:30:00Z');
export const TODAY = '2026-10-22';

const fakeAuth: AuthVerifier = { verify: async (token) => TOKENS[token] ?? null };

export function makeFakeAi(overrides: Partial<AiService> = {}): AiService {
  return {
    isConfigured: true,
    generatePlan: vi.fn(async () => makeAiPlan()),
    chat: vi.fn(async () => ({ reply: 'Start by confirming the venue.', proposals: [] })),
    suggestSavings: vi.fn(async () => ({ ideas: [{ title: 'Seasonal flowers', detail: 'Use seasonal blooms.', category: 'decoration' as const }] })),
    ...overrides,
  };
}

export function buildTestApp(options: { ai?: AiService; limits?: { api?: number; ai?: number }; config?: Partial<AppConfig> } = {}) {
  const repo = createMemoryRepository();
  const ai = options.ai ?? makeFakeAi();
  const app = createApp({ config: { ...testConfig, ...options.config }, repo, ai, auth: fakeAuth, logger: silentLogger, now: () => FIXED_NOW, limits: options.limits });
  return { app, repo, ai };
}

export const validEventBody = {
  name: 'Aanya’s wedding',
  eventType: 'wedding',
  eventDate: '2027-02-14',
  city: 'Pune',
  totalBudget: 800_000,
  guestCount: 300,
};

/** Convenience wrapper that signs requests with a test token. */
export function asUser(app: ReturnType<typeof buildTestApp>['app'], token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  return {
    get: (url: string) => request(app).get(url).set(auth),
    post: (url: string, body?: object) => request(app).post(url).set(auth).send(body),
    patch: (url: string, body?: object) => request(app).patch(url).set(auth).send(body),
    delete: (url: string) => request(app).delete(url).set(auth),
  };
}
