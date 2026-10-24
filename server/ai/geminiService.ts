import { aiChatReplySchema, aiPlanSchema, aiSavingsSchema } from '@shared/schemas';
import type { AiService } from './aiService';
import type { GeminiClient } from './geminiClient';
import {
  buildChatContent,
  buildPlanContent,
  buildSavingsContent,
  CHAT_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
  SAVINGS_SYSTEM_PROMPT,
} from './prompts';

/**
 * AiService backed by Google Gemini. One model call per request; output is schema-validated.
 * Output limits leave headroom because the model's thinking tokens count against them.
 */
export function createGeminiService(client: GeminiClient, isConfigured: boolean): AiService {
  return {
    isConfigured,

    generatePlan({ workspace, notes }) {
      return client.generateStructured({
        schema: aiPlanSchema,
        systemInstruction: PLAN_SYSTEM_PROMPT,
        userContent: buildPlanContent(workspace, notes),
        maxOutputTokens: 16_000,
        temperature: 0.8,
      });
    },

    chat({ workspace, message, history }) {
      return client.generateStructured({
        schema: aiChatReplySchema,
        systemInstruction: CHAT_SYSTEM_PROMPT,
        userContent: buildChatContent(workspace, message, history),
        maxOutputTokens: 4_000,
        temperature: 0.6,
      });
    },

    suggestSavings({ workspace }) {
      return client.generateStructured({
        schema: aiSavingsSchema,
        systemInstruction: SAVINGS_SYSTEM_PROMPT,
        userContent: buildSavingsContent(workspace),
        maxOutputTokens: 5_000,
        temperature: 0.7,
      });
    },
  };
}
