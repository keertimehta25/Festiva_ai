import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Page } from '@playwright/test';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

/** Seeds a signed-in Supabase session in local storage (the key is derived from the fake project host "e2e"). */
export async function signIn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const session = {
      access_token: 'e2e-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
      refresh_token: 'e2e-refresh',
      user: { id: '33333333-3333-4333-8333-333333333333', aud: 'authenticated', role: 'authenticated', email: 'e2e@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
    };
    window.localStorage.setItem('sb-e2e-auth-token', JSON.stringify(session));
  });
}

export interface AxeViolation { id: string; impact: string | null; help: string; nodes: number; target: string }

/** Runs axe-core inside the real page, including the colour-contrast rule that jsdom cannot evaluate. */
export async function runAxe(page: Page): Promise<AxeViolation[]> {
  await page.evaluate(AXE_SOURCE);
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: { id: string; impact: string | null; help: string; nodes: { target: unknown[] }[] }[] }> } }).axe;
    const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, target: String(v.nodes[0]?.target[0] ?? '') }));
  });
}

/** Saves a screenshot when E2E_SHOTS names a directory (used for manual visual review). */
export async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env.E2E_SHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}
