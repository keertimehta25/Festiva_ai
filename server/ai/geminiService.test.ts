import { describe, expect, it, vi } from 'vitest';
import { aiChatReplySchema, aiPlanSchema, aiSavingsSchema } from '@shared/schemas';
import { makeEvent } from '@shared/test-utils';
import type { AiWorkspace } from './aiService';
import type { GeminiClient } from './geminiClient';
import { createGeminiService } from './geminiService';

const workspace: AiWorkspace = { event: makeEvent(), tasks: [], expenses: [], vendors: [], today: '2026-11-01' };

function setup() {
  const generateStructured = vi.fn().mockResolvedValue({ ok: true });
  const service = createGeminiService({ generateStructured }, true);
  return { service, generateStructured };
}

describe('createGeminiService', () => {
  it('reports whether the AI key is configured', () => {
    const client = { generateStructured: vi.fn() } as unknown as GeminiClient;
    expect(createGeminiService(client, true).isConfigured).toBe(true);
    expect(createGeminiService(client, false).isConfigured).toBe(false);
  });

  it('asks for a plan with the plan schema and a generous output limit', async () => {
    const { service, generateStructured } = setup();
    await service.generatePlan({ workspace, notes: ['Budget is tight'] });

    const request = generateStructured.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request.schema).toBe(aiPlanSchema);
    expect(request.maxOutputTokens).toBe(16_000);
    expect(String(request.userContent)).toContain('Budget is tight');
  });

  it('asks the copilot for a reply with the chat schema and the user’s message', async () => {
    const { service, generateStructured } = setup();
    await service.chat({ workspace, message: 'Where can I save money?', history: [] });

    const request = generateStructured.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request.schema).toBe(aiChatReplySchema);
    expect(String(request.userContent)).toContain('Where can I save money?');
  });

  it('asks for savings ideas with the savings schema', async () => {
    const { service, generateStructured } = setup();
    await service.suggestSavings({ workspace });

    expect((generateStructured.mock.calls[0]?.[0] as Record<string, unknown>).schema).toBe(aiSavingsSchema);
  });
});
