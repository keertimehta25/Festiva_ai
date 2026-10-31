import { z } from 'zod';
import {
  BUDGET_CATEGORIES,
  EVENT_TYPES,
  FOOD_PREFERENCES,
  LIMITS,
  PAYMENT_STATUSES,
  PLANNING_PRIORITIES,
  PRIORITIES,
  TASK_CATEGORIES,
  TASK_STATUSES,
  VENDOR_CATEGORIES,
  VENDOR_STATUSES,
  VENUE_SETTINGS,
} from './constants';
import { isValidIsoDate } from './dates';

/** Removes control characters (keeps tab, newline, carriage return) from untrusted text. */
export function stripControlChars(value: string): string {
  let result = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    const isControl = (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127;
    if (!isControl) result += char;
  }
  return result;
}

const text = (max: number) =>
  z
    .string()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => stripControlChars(v).trim());
const requiredText = (max: number, label: string) => text(max).refine((v) => v.length > 0, `${label} is required`);

const money = z
  .number('Enter a valid amount')
  .int('Enter a whole number of rupees')
  .min(0, 'Amount cannot be negative')
  .max(LIMITS.maxMoney, 'Amount is too large');

const isoDate = z.string().refine(isValidIsoDate, 'Enter a valid date');

export const idSchema = z.uuid('Invalid id');

const NO_FIELDS_MESSAGE = 'Provide at least one field to update';

/** Turns a field map into a partial-update schema that rejects an empty patch. */
function partialUpdate<Shape extends z.ZodRawShape>(shape: Shape) {
  return z
    .object(shape)
    .partial()
    .refine((patch) => Object.keys(patch).length > 0, NO_FIELDS_MESSAGE);
}

// ---------------------------------------------------------------- events

export const allocationsSchema = z.record(z.enum(BUDGET_CATEGORIES), money);
export type Allocations = z.infer<typeof allocationsSchema>;

// Field rules without defaults. Update schemas use these directly so a partial update can
// never silently reset a field to its default; create schemas add defaults on top.
const eventCore = {
  name: requiredText(120, 'Event name'),
  eventType: z.enum(EVENT_TYPES, 'Choose an event type'),
  eventDate: isoDate.nullable(),
  dateIsApproximate: z.boolean(),
  city: text(80),
  venuePreference: text(200),
  totalBudget: money.min(1000, 'Budget must be at least ₹1,000'),
  guestCount: z
    .number('Enter the number of guests')
    .int('Guest count must be a whole number')
    .min(1, 'At least 1 guest is needed')
    .max(LIMITS.maxGuests, 'Guest count is too large'),
  durationHours: z
    .number('Enter the duration in hours')
    .int('Duration must be a whole number of hours')
    .min(1, 'Duration must be at least 1 hour')
    .max(LIMITS.maxDurationHours, 'Duration is too long'),
  theme: text(200),
  colors: text(120),
  foodPreference: z.enum(FOOD_PREFERENCES),
  venueSetting: z.enum(VENUE_SETTINGS),
  culturalNotes: text(600),
  priorities: z.array(z.enum(PLANNING_PRIORITIES)).max(PLANNING_PRIORITIES.length),
  currency: z.literal('INR'),
};

/** Event details without any "today" dependent rules. */
export const eventBaseSchema = z.object({
  ...eventCore,
  eventDate: eventCore.eventDate.default(null),
  dateIsApproximate: eventCore.dateIsApproximate.default(false),
  city: eventCore.city.default(''),
  venuePreference: eventCore.venuePreference.default(''),
  durationHours: eventCore.durationHours.default(4),
  theme: eventCore.theme.default(''),
  colors: eventCore.colors.default(''),
  foodPreference: eventCore.foodPreference.default('mixed'),
  venueSetting: eventCore.venueSetting.default('either'),
  culturalNotes: eventCore.culturalNotes.default(''),
  priorities: eventCore.priorities.default([]),
  currency: eventCore.currency.default('INR'),
});

/**
 * Creating an event: the date, when given, must not be in the past.
 * The rule sits on the field itself (not on the whole object) so the error is reported
 * together with errors in other fields instead of only after they are fixed.
 */
export function eventCreateSchema(today: string) {
  return eventBaseSchema.extend({
    eventDate: eventCore.eventDate
      .refine((date) => date === null || date >= today, 'Choose today or a future date')
      .default(null),
  });
}

/** Updating an event: every field optional; allocations may be replaced explicitly. */
export const eventUpdateSchema = partialUpdate({ ...eventCore, allocations: allocationsSchema });

export type EventInput = z.infer<typeof eventBaseSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;

// ----------------------------------------------------------------- tasks

const taskCore = {
  title: requiredText(140, 'Task title'),
  description: text(500),
  dueDate: isoDate.nullable(),
  priority: z.enum(PRIORITIES),
  status: z.enum(TASK_STATUSES),
  category: z.enum(TASK_CATEGORIES),
  notes: text(500),
  vendorId: idSchema.nullable(),
};

export const taskInputSchema = z.object({
  ...taskCore,
  description: taskCore.description.default(''),
  dueDate: taskCore.dueDate.default(null),
  priority: taskCore.priority.default('medium'),
  status: taskCore.status.default('pending'),
  category: taskCore.category.default('planning'),
  notes: taskCore.notes.default(''),
  vendorId: taskCore.vendorId.default(null),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

export const taskUpdateSchema = partialUpdate(taskCore);

// -------------------------------------------------------------- expenses

const expenseCore = {
  title: requiredText(120, 'Expense title'),
  category: z.enum(BUDGET_CATEGORIES, 'Choose a category'),
  estimatedAmount: money,
  actualAmount: money,
  vendorId: idSchema.nullable(),
  notes: text(300),
};

export const expenseInputSchema = z
  .object({
    ...expenseCore,
    estimatedAmount: expenseCore.estimatedAmount.default(0),
    actualAmount: expenseCore.actualAmount.default(0),
    vendorId: expenseCore.vendorId.default(null),
    notes: expenseCore.notes.default(''),
  })
  .refine((expense) => expense.estimatedAmount > 0 || expense.actualAmount > 0, {
    path: ['actualAmount'],
    message: 'Enter an estimated or an actual amount',
  });
export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const expenseUpdateSchema = partialUpdate(expenseCore);

// --------------------------------------------------------------- vendors

const vendorCore = {
  name: requiredText(120, 'Vendor name'),
  category: z.enum(VENDOR_CATEGORIES, 'Choose a category'),
  contact: text(200),
  quotedPrice: money,
  advanceAmount: money,
  paymentStatus: z.enum(PAYMENT_STATUSES),
  bookingStatus: z.enum(VENDOR_STATUSES),
  notes: text(500),
  followUpDate: isoDate.nullable(),
};

export const vendorInputSchema = z
  .object({
    ...vendorCore,
    contact: vendorCore.contact.default(''),
    quotedPrice: vendorCore.quotedPrice.default(0),
    advanceAmount: vendorCore.advanceAmount.default(0),
    paymentStatus: vendorCore.paymentStatus.default('unpaid'),
    bookingStatus: vendorCore.bookingStatus.default('shortlisted'),
    notes: vendorCore.notes.default(''),
    followUpDate: vendorCore.followUpDate.default(null),
  })
  .refine((vendor) => vendor.advanceAmount <= vendor.quotedPrice, {
    path: ['advanceAmount'],
    message: 'The advance cannot be more than the quoted price',
  });
export type VendorInput = z.infer<typeof vendorInputSchema>;

export const vendorUpdateSchema = partialUpdate(vendorCore);

// --------------------------------------------------------------------- AI

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
