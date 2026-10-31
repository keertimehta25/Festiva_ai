import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string | undefined;
}

/** Turns a bearer token into a verified user, or null when the token is invalid or expired. */
export interface AuthVerifier {
  verify(token: string): Promise<AuthUser | null>;
}

/** Verifies Supabase Auth access tokens by asking Supabase who the token belongs to. */
export function createSupabaseVerifier(db: SupabaseClient): AuthVerifier {
  return {
    async verify(token) {
      const { data, error } = await db.auth.getUser(token);
      if (error) return null;
      return { id: data.user.id, email: data.user.email };
    },
  };
}

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 500;

/**
 * Remembers successful verifications for a short time so a burst of requests from one
 * page load does not call the auth provider each time. Tokens are stored only as hashes,
 * in this process's memory, and failed verifications are never cached.
 */
export function withVerificationCache(inner: AuthVerifier, now: () => number = Date.now): AuthVerifier {
  const cache = new Map<string, { user: AuthUser; expiresAt: number }>();
  return {
    async verify(token) {
      const key = createHash('sha256').update(token).digest('hex');
      const hit = cache.get(key);
      if (hit && hit.expiresAt > now()) return hit.user;

      const user = await inner.verify(token);
      if (user) {
        if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
        cache.set(key, { user, expiresAt: now() + CACHE_TTL_MS });
      } else {
        cache.delete(key);
      }
      return user;
    },
  };
}
