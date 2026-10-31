import { describe, expect, it } from 'vitest';
import { analyzeEventInput } from './eventChecks';
import { normalizePlan } from './planNormalizer';
import {
  aiPlanSchema,
  chatRequestSchema,
  eventBaseSchema,
  eventCreateSchema,
  eventUpdateSchema,
  expenseInputSchema,
  stripControlChars,
  taskInputSchema,
  taskUpdateSchema,
  vendorInputSchema,
} from './schemas';
import { sumAllocations } from './calc/budget';
import { makeAiPlan } from './test-utils';

const TODAY = '2026-10-22';
const validEvent = { name: 'Aanya’s wedding', eventType: 'wedding', totalBudget: 800_000, guestCount: 300 };

describe('event validation', () => {
  it('accepts a minimal event and fills sensible defaults', () => {
    const parsed = eventCreateSchema(TODAY).parse(validEvent);
    expect(parsed).toMatchObject({
      currency: 'INR',
      durationHours: 4,
      foodPreference: 'mixed',
      venueSetting: 'either',
      priorities: [],
      eventDate: null,
    });
  });

  it.each([
    ['empty name', { name: '   ' }, 'name'],
    ['unknown type', { eventType: 'rave' }, 'eventType'],
    ['zero guests', { guestCount: 0 }, 'guestCount'],
    ['negative guests', { guestCount: -5 }, 'guestCount'],
    ['fractional guests', { guestCount: 10.5 }, 'guestCount'],
    ['absurd guests', { guestCount: 10_000_000 }, 'guestCount'],
    ['negative budget', { totalBudget: -1 }, 'totalBudget'],
    ['tiny budget', { totalBudget: 500 }, 'totalBudget'],
    ['text budget', { totalBudget: 'lots' }, 'totalBudget'],
    ['huge budget', { totalBudget: 9_999_999_999 }, 'totalBudget'],
    ['zero duration', { durationHours: 0 }, 'durationHours'],
  ])('rejects %s', (_label, override, field) => {
    const result = eventCreateSchema(TODAY).safeParse({ ...validEvent, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });

  it('rejects impossible and past dates but allows today and the future', () => {
    const parse = (eventDate: string) => eventCreateSchema(TODAY).safeParse({ ...validEvent, eventDate }).success;
    expect(parse('2026-02-30')).toBe(false);
    expect(parse('not-a-date')).toBe(false);
    expect(parse('2026-10-21')).toBe(false);
    expect(parse('2026-10-22')).toBe(true);
    expect(parse('2027-01-15')).toBe(true);
  });

  it('reports a past date together with other field errors', () => {
    const result = eventCreateSchema(TODAY).safeParse({ ...validEvent, totalBudget: -5, eventDate: '2020-01-01' });
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['totalBudget', 'eventDate']));
  });

  it('strips control characters and trims untrusted text', () => {
    expect(stripControlChars('a\u0000b\u0007c\nd')).toBe('abc\nd');
    expect(eventBaseSchema.parse({ ...validEvent, name: '  Party\u0000  ' }).name).toBe('Party');
  });

  it('rejects overly long free text', () => {
    expect(eventBaseSchema.safeParse({ ...validEvent, culturalNotes: 'x'.repeat(601) }).success).toBe(false);
  });
});

describe('partial update schemas', () => {
  it('never inject defaults, so an update cannot silently reset other fields', () => {
    expect(eventUpdateSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
    expect(taskUpdateSchema.parse({ status: 'completed' })).toEqual({ status: 'completed' });
  });

  it('require at least one field and still validate the ones provided', () => {
    expect(eventUpdateSchema.safeParse({}).success).toBe(false);
    expect(eventUpdateSchema.safeParse({ guestCount: 0 }).success).toBe(false);
    expect(taskUpdateSchema.safeParse({ dueDate: '2026-02-31' }).success).toBe(false);
  });
});

describe('event input checks', () => {
  const parsed = (override = {}) => eventBaseSchema.parse({ ...validEvent, ...override });

  it('warns about a very tight budget per guest', () => {
    expect(analyzeEventInput(parsed({ totalBudget: 20_000, guestCount: 300 })).join(' ')).toMatch(/per guest/);
  });

  it('warns about contradictory priorities and outdoor events in the monsoon', () => {
    const notes = analyzeEventInput(
      parsed({ priorities: ['luxury', 'affordability'], venueSetting: 'outdoor', eventDate: '2027-07-10' }),
    ).join(' ');
    expect(notes).toMatch(/Luxury and affordability/);
    expect(notes).toMatch(/monsoon/);
  });

  it('has no warnings for a comfortable, consistent plan', () => {
    expect(analyzeEventInput(parsed({ eventDate: '2027-02-14' }))).toEqual([]);
  });
});

describe('task, expense and vendor validation', () => {
  it('requires a task title and rejects invalid dates', () => {
    expect(taskInputSchema.safeParse({ title: '' }).success).toBe(false);
    expect(taskInputSchema.safeParse({ title: 'Book venue', dueDate: '2026-13-01' }).success).toBe(false);
    expect(taskInputSchema.parse({ title: 'Book venue' })).toMatchObject({
      status: 'pending',
      priority: 'medium',
      category: 'planning',
    });
  });

  it('rejects negative, fractional and non-numeric money', () => {
    const base = { title: 'Decor', category: 'decoration' };
    expect(expenseInputSchema.safeParse({ ...base, actualAmount: -1 }).success).toBe(false);
    expect(expenseInputSchema.safeParse({ ...base, actualAmount: 10.5 }).success).toBe(false);
    expect(expenseInputSchema.safeParse({ ...base, actualAmount: '1000' }).success).toBe(false);
    expect(expenseInputSchema.safeParse({ ...base, actualAmount: Number.NaN }).success).toBe(false);
    expect(expenseInputSchema.safeParse({ ...base }).success).toBe(false);
    expect(expenseInputSchema.safeParse({ ...base, actualAmount: 5_000 }).success).toBe(true);
  });

  it('does not allow a vendor advance larger than the quote', () => {
    const base = { name: 'Sample Caterer', category: 'caterer', quotedPrice: 10_000 };
    expect(vendorInputSchema.safeParse({ ...base, advanceAmount: 20_000 }).success).toBe(false);
    expect(vendorInputSchema.safeParse({ ...base, advanceAmount: 2_000 }).success).toBe(true);
  });

  it('bounds chat messages', () => {
    expect(chatRequestSchema.safeParse({ message: '' }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ message: 'x'.repeat(1001) }).success).toBe(false);
    expect(chatRequestSchema.parse({ message: 'hello' }).history).toEqual([]);
  });
});

describe('AI plan schema and normalisation', () => {
  const validPlan = makeAiPlan();

  it('accepts a well-formed plan', () => {
    expect(aiPlanSchema.safeParse(validPlan).success).toBe(true);
  });

  it.each([
    ['a missing section', { ...validPlan, risks: undefined }],
    [
      'an unknown budget category',
      { ...validPlan, budgetAllocation: [{ category: 'yacht', percent: 10, rationale: '' }] },
    ],
    [
      'a percentage above 100',
      { ...validPlan, budgetAllocation: [{ category: 'venue', percent: 250, rationale: '' }] },
    ],
    [
      'a negative estimate',
      { ...validPlan, expenseEstimates: [{ category: 'venue', item: 'x', estimatedAmount: -5 }] },
    ],
    ['an over-long summary', { ...validPlan, concept: { ...validPlan.concept, summary: 'x'.repeat(901) } }],
  ])('rejects %s', (_label, plan) => {
    expect(aiPlanSchema.safeParse(plan).success).toBe(false);
  });

  it('computes rupee amounts deterministically from the percentages', () => {
    const stored = normalizePlan(aiPlanSchema.parse(validPlan), 800_000, 'test-model');
    expect(stored.allocationAmounts.venue).toBe(200_000);
    expect(stored.allocationAmounts.catering).toBe(600_000);
    expect(sumAllocations(stored.allocationAmounts)).toBe(800_000);
    expect(stored.expenseEstimates[0]?.estimatedAmount).toBe(450_000);
    expect(stored.estimatedTotal).toBe(450_000);
    expect(stored.budgetWarning).toBeNull();
    expect(stored.model).toBe('test-model');
  });

  it('warns when the itemised estimates exceed the budget', () => {
    const stored = normalizePlan(aiPlanSchema.parse(validPlan), 100_000, 'test-model');
    expect(stored.budgetWarning).toMatch(/more than your budget/);
  });
});
