import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { createSupabaseVerifier, withVerificationCache, type AuthUser, type AuthVerifier } from './verifier';

const alice: AuthUser = { id: 'alice', email: 'alice@example.com' };

describe('createSupabaseVerifier', () => {
  it('returns the user that Supabase says owns the token', async () => {
    const getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: 'alice', email: 'alice@example.com' } }, error: null });
    const verifier = createSupabaseVerifier({ auth: { getUser } } as unknown as SupabaseClient);

    await expect(verifier.verify('token-1')).resolves.toEqual(alice);
    expect(getUser).toHaveBeenCalledWith('token-1');
  });

  it('returns null for an invalid or expired token', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } });
    const verifier = createSupabaseVerifier({ auth: { getUser } } as unknown as SupabaseClient);

    await expect(verifier.verify('bad')).resolves.toBeNull();
  });
});

describe('withVerificationCache', () => {
  function setup(result: AuthUser | null = alice) {
    const inner: AuthVerifier = { verify: vi.fn().mockResolvedValue(result) };
    let time = 1_000;
    const cached = withVerificationCache(inner, () => time);
    return { inner, cached, advance: (ms: number) => (time += ms) };
  }

  it('asks the provider once for repeated requests with the same token', async () => {
    const { inner, cached } = setup();
    await expect(cached.verify('t')).resolves.toEqual(alice);
    await expect(cached.verify('t')).resolves.toEqual(alice);
    expect(inner.verify).toHaveBeenCalledTimes(1);
  });

  it('asks again after the entry expires', async () => {
    const { inner, cached, advance } = setup();
    await cached.verify('t');
    advance(31_000);
    await cached.verify('t');
    expect(inner.verify).toHaveBeenCalledTimes(2);
  });

  it('keeps different tokens apart', async () => {
    const { inner, cached } = setup();
    await cached.verify('one');
    await cached.verify('two');
    expect(inner.verify).toHaveBeenCalledTimes(2);
  });

  it('never caches a failed verification', async () => {
    const { inner, cached } = setup(null);
    await expect(cached.verify('bad')).resolves.toBeNull();
    await expect(cached.verify('bad')).resolves.toBeNull();
    expect(inner.verify).toHaveBeenCalledTimes(2);
  });

  it('empties itself when it grows past its size limit', async () => {
    const { inner, cached } = setup();
    for (let i = 0; i < 501; i += 1) await cached.verify(`token-${i}`);
    await cached.verify('token-0');
    expect(inner.verify).toHaveBeenCalledTimes(502);
  });
});
