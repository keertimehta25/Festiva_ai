import { describe, expect, it, vi } from 'vitest';
import { createGeminiService } from './ai/geminiService';
import { createGeminiClient } from './ai/geminiClient';
import { createSupabaseRepository } from './data/supabaseRepository';
import { withVerificationCache, type AuthVerifier } from './auth/verifier';
import { loadConfig } from './config';
import { silentLogger } from './logger';
import { makeEvent } from '@shared/test-utils';

const baseEnv = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(40),
};

describe('loadConfig', () => {
  it('applies safe defaults', () => {
    const config = loadConfig(baseEnv);
    expect(config).toMatchObject({ env: 'development', port: 8787, trustProxy: 0, timeZone: 'Asia/Kolkata' });
    expect(config.gemini).toEqual({ apiKey: undefined, model: 'gemini-3.6-flash', timeoutMs: 90_000, thinkingLevel: undefined });
  });

  it('treats a blank Gemini key as not configured', () => {
    expect(loadConfig({ ...baseEnv, GEMINI_API_KEY: '   ' }).gemini.apiKey).toBeUndefined();
    expect(loadConfig({ ...baseEnv, GEMINI_API_KEY: 'abc1234567890' }).gemini.apiKey).toBe('abc1234567890');
  });

  it('reads the model name from configuration', () => {
    expect(loadConfig({ ...baseEnv, GEMINI_MODEL: 'some-other-model' }).gemini.model).toBe('some-other-model');
  });

  it('accepts only known thinking levels and treats blank as unset', () => {
    expect(loadConfig({ ...baseEnv, GEMINI_THINKING_LEVEL: 'low' }).gemini.thinkingLevel).toBe('low');
    expect(loadConfig({ ...baseEnv, GEMINI_THINKING_LEVEL: '' }).gemini.thinkingLevel).toBeUndefined();
    expect(() => loadConfig({ ...baseEnv, GEMINI_THINKING_LEVEL: 'extreme' })).toThrow(/GEMINI_THINKING_LEVEL/);
  });

  it('fails with a readable message when required values are missing or invalid', () => {
    expect(() => loadConfig({})).toThrow(/SUPABASE_URL/);
    expect(() => loadConfig({ ...baseEnv, SUPABASE_URL: 'nope' })).toThrow(/SUPABASE_URL/);
    expect(() => loadConfig({ ...baseEnv, SUPABASE_SERVICE_ROLE_KEY: 'short' })).toThrow(/SERVICE_ROLE_KEY/);
    expect(() => loadConfig({ ...baseEnv, PORT: '99999' })).toThrow(/PORT/);
  });

  it('requires an explicit CORS origin in production and trusts one proxy hop', () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production' })).toThrow(/CORS_ORIGINS/);
    const config = loadConfig({ ...baseEnv, NODE_ENV: 'production', CORS_ORIGINS: 'https://a.example, https://b.example' });
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.trustProxy).toBe(1);
  });
});

describe('AI service without configuration', () => {
  it('reports itself as unconfigured and answers 503 rather than returning made-up content', async () => {
    const fetchFn = vi.fn();
    const client = createGeminiClient({ apiKey: undefined, model: 'm', timeoutMs: 1000, thinkingLevel: undefined }, silentLogger, fetchFn as unknown as typeof fetch);
    const service = createGeminiService(client, false);
    expect(service.isConfigured).toBe(false);
    await expect(service.chat({ workspace: { event: makeEvent(), tasks: [], expenses: [], vendors: [], today: '2026-10-22' }, message: 'hi', history: [] })).rejects.toMatchObject({
      status: 503,
      code: 'AI_NOT_CONFIGURED',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('withVerificationCache', () => {
  const user = { id: 'u1', email: undefined };

  it('reuses a successful verification briefly, then asks again', async () => {
    let now = 0;
    const inner: AuthVerifier = { verify: vi.fn(async () => user) };
    const cached = withVerificationCache(inner, () => now);

    await cached.verify('token');
    await cached.verify('token');
    expect(inner.verify).toHaveBeenCalledTimes(1);

    now = 31_000;
    await cached.verify('token');
    expect(inner.verify).toHaveBeenCalledTimes(2);
  });

  it('never caches failures', async () => {
    const inner: AuthVerifier = { verify: vi.fn(async () => null) };
    const cached = withVerificationCache(inner);
    expect(await cached.verify('bad')).toBeNull();
    expect(await cached.verify('bad')).toBeNull();
    expect(inner.verify).toHaveBeenCalledTimes(2);
  });
});

describe('Supabase repository', () => {
  /** Records the calls made against a stand-in for the Supabase query builder. */
  function fakeClient(rows: Record<string, unknown>[]) {
    const calls: [string, ...unknown[]][] = [];
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order', 'limit', 'insert', 'update', 'delete']) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    builder.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
    builder.then = (resolve: (value: unknown) => void) => resolve({ data: rows, error: null });
    return { client: { from: (table: string) => { calls.push(['from', table]); return builder; } }, calls };
  }

  it('always scopes reads by the authenticated user id', async () => {
    const { client, calls } = fakeClient([{ id: 'e1', user_id: 'alice', name: 'x', total_budget: 1 }]);
    const repo = createSupabaseRepository(client as never);
    const event = await repo.events.get('alice', 'e1');

    expect(calls).toContainEqual(['eq', 'user_id', 'alice']);
    expect(calls).toContainEqual(['eq', 'id', 'e1']);
    expect(event).not.toBeNull();
    expect(event).not.toHaveProperty('userId');
    expect(event).toMatchObject({ totalBudget: 1 });
  });

  it('scopes child queries by user and event, and writes the owner on insert', async () => {
    const { client, calls } = fakeClient([{ id: 't1', user_id: 'alice', event_id: 'e1', title: 'x' }]);
    const repo = createSupabaseRepository(client as never);
    await repo.tasks.list('alice', 'e1');
    await repo.tasks.remove('alice', 'e1', 't1');
    await repo.tasks.create('alice', 'e1', { title: 'New', description: '', dueDate: null, priority: 'low', status: 'pending', category: 'planning', notes: '', vendorId: null });

    expect(calls.filter((c) => c[0] === 'eq' && c[1] === 'user_id')).toHaveLength(2);
    expect(calls.filter((c) => c[0] === 'eq' && c[1] === 'event_id')).toHaveLength(2);
    const insert = calls.find((c) => c[0] === 'insert');
    expect((insert?.[1] as Record<string, unknown>[])[0]).toMatchObject({ user_id: 'alice', event_id: 'e1', due_date: null, vendor_id: null });
  });
});
