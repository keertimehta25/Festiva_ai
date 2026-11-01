import { z } from 'zod';
import { BUDGET_CATEGORIES, LIMITS, PRIORITIES, TASK_CATEGORIES, VENDOR_CATEGORIES } from '../constants';
import { requiredText, text } from './fields';

const aiText = (max: number) => z.string().max(max);
const aiList = (max: number, itemMax: number) => z.array(aiText(itemMax)).max(max);

/**
 * The structure the model must return for a full event plan. Plain types only
 * (no transforms or defaults) so it converts cleanly to a JSON Schema for the provider.
 */
export const aiPlanSchema = z.object({
  concept: z.object({
    title: aiText(120),
    summary: aiText(900),
    themeIdeas: aiList(6, 160),
  }),
  assumptions: aiList(8, 240),
  budgetAllocation: z
    .array(
      z.object({
        category: z.enum(BUDGET_CATEGORIES),
        percent: z.number().min(0).max(100),
        rationale: aiText(240),
      }),
    )
    .max(BUDGET_CATEGORIES.length),
  expenseEstimates: z
    .array(
      z.object({
        category: z.enum(BUDGET_CATEGORIES),
        item: aiText(120),
        estimatedAmount: z.number().min(0).max(LIMITS.maxMoney),
      }),
    )
    .max(30),
  timeline: z
    .array(
      z.object({
        title: aiText(140),
        description: aiText(300),
        category: z.enum(TASK_CATEGORIES),
        priority: z.enum(PRIORITIES),
        daysBeforeEvent: z.number().int().min(0).max(730),
      }),
    )
    .max(30),
  vendorChecklist: z
    .array(
      z.object({
        category: z.enum(VENDOR_CATEGORIES),
        questionsToAsk: aiList(5, 200),
      }),
    )
    .max(10),
  guestChecklist: aiList(12, 200),
  ideas: z.object({
    decoration: aiList(6, 200),
    food: aiList(6, 200),
    activities: aiList(6, 200),
    entertainment: aiList(6, 200),
  }),
  daySchedule: z.array(z.object({ time: aiText(20), activity: aiText(200), notes: aiText(200) })).max(20),
  risks: z.array(z.object({ risk: aiText(200), contingency: aiText(300) })).max(8),
  costSavingTips: aiList(8, 240),
  personalRecommendations: aiList(8, 300),
  clarifyingQuestions: aiList(4, 240),
});
export type AiPlan = z.infer<typeof aiPlanSchema>;

export const aiSavingsSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: aiText(100),
        detail: aiText(400),
        category: z.enum(BUDGET_CATEGORIES),
      }),
    )
    .min(1)
    .max(8),
});
export type AiSavings = z.infer<typeof aiSavingsSchema>;

/** A change the copilot suggests. It is never applied until the user confirms it. */
export const aiProposalSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add_task'),
    summary: aiText(200),
    task: z.object({
      title: aiText(140),
      description: aiText(300),
      category: z.enum(TASK_CATEGORIES),
      priority: z.enum(PRIORITIES),
      dueDate: aiText(10).nullable(),
    }),
  }),
  z.object({
    type: z.literal('reallocate'),
    summary: aiText(200),
    fromCategory: z.enum(BUDGET_CATEGORIES),
    toCategory: z.enum(BUDGET_CATEGORIES),
    amount: z.number().int().min(1).max(LIMITS.maxMoney),
  }),
]);
export type AiProposal = z.infer<typeof aiProposalSchema>;

export const aiChatReplySchema = z.object({
  reply: aiText(2500),
  proposals: z.array(aiProposalSchema).max(3),
});
export type AiChatReply = z.infer<typeof aiChatReplySchema>;

export const chatRequestSchema = z.object({
  message: requiredText(LIMITS.maxChatMessageChars, 'Message'),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: text(2500) }))
    .max(LIMITS.maxChatHistory)
    .default([]),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
