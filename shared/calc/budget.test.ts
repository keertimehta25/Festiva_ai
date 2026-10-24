import { describe, expect, it } from 'vitest';
import { BUDGET_CATEGORIES, DEFAULT_ALLOCATION_PERCENT, EVENT_TYPES } from '../constants';
import { makeAllocations, makeExpense } from '../test-utils';
import {
  allocationsFromPercents,
  applyReallocation,
  defaultAllocations,
  scaleAllocations,
  sumAllocations,
  summarizeBudget,
  suggestReallocations,
} from './budget';

describe('default allocation percentages', () => {
  it.each(EVENT_TYPES)('add up to exactly 100 for %s events', (type) => {
    const total = BUDGET_CATEGORIES.reduce((sum, category) => sum + DEFAULT_ALLOCATION_PERCENT[type][category], 0);
    expect(total).toBe(100);
  });
});

describe('allocationsFromPercents', () => {
  it('produces whole rupees that sum exactly to the total, even with awkward numbers', () => {
    const allocations = defaultAllocations('wedding', 799_999);
    expect(sumAllocations(allocations)).toBe(799_999);
    expect(Object.values(allocations).every(Number.isInteger)).toBe(true);
  });

  it('normalises percentages that do not add up to 100', () => {
    const allocations = allocationsFromPercents({ venue: 1, catering: 3 }, 400_000);
    expect(allocations.venue).toBe(100_000);
    expect(allocations.catering).toBe(300_000);
  });

  it('treats negative shares as zero and rejects an all-zero input', () => {
    expect(allocationsFromPercents({ venue: -5, catering: 10 }, 1000).venue).toBe(0);
    expect(() => allocationsFromPercents({}, 1000)).toThrow(RangeError);
  });
});

describe('scaleAllocations', () => {
  it('keeps proportions when the total budget changes', () => {
    const scaled = scaleAllocations(makeAllocations({ venue: 100, catering: 300 }), 'wedding', 800);
    expect(scaled.venue).toBe(200);
    expect(scaled.catering).toBe(600);
  });

  it('falls back to the event-type defaults when nothing was allocated', () => {
    const scaled = scaleAllocations(makeAllocations(), 'birthday', 100_000);
    expect(sumAllocations(scaled)).toBe(100_000);
    expect(scaled.catering).toBe(40_000);
  });
});

describe('summarizeBudget', () => {
  const allocations = makeAllocations({ venue: 200_000, catering: 300_000, decoration: 100_000 });

  it('calculates totals, remaining balance and percentage consumed', () => {
    const summary = summarizeBudget(600_000, allocations, [
      makeExpense({ category: 'venue', actualAmount: 50_000, estimatedAmount: 200_000 }),
      makeExpense({ category: 'catering', actualAmount: 100_000, estimatedAmount: 280_000 }),
    ]);
    expect(summary.totalActual).toBe(150_000);
    expect(summary.totalEstimated).toBe(480_000);
    expect(summary.remaining).toBe(450_000);
    expect(summary.percentConsumed).toBe(25);
    expect(summary.overBudget).toBe(false);
    expect(summary.unallocated).toBe(0);
  });

  it('recalculates when an expense is added or edited', () => {
    const expense = makeExpense({ category: 'venue', actualAmount: 10_000 });
    const before = summarizeBudget(600_000, allocations, [expense]);
    const after = summarizeBudget(600_000, allocations, [{ ...expense, actualAmount: 25_000 }, makeExpense({ category: 'decoration', actualAmount: 5_000 })]);
    expect(before.remaining).toBe(590_000);
    expect(after.remaining).toBe(570_000);
  });

  it('flags categories as warning at 85% and over when exceeded', () => {
    const summary = summarizeBudget(600_000, allocations, [
      makeExpense({ category: 'venue', actualAmount: 170_000 }),
      makeExpense({ category: 'decoration', actualAmount: 120_000 }),
      makeExpense({ category: 'catering', actualAmount: 100_000 }),
    ]);
    const byCategory = Object.fromEntries(summary.categories.map((row) => [row.category, row]));
    expect(byCategory.venue?.status).toBe('warning');
    expect(byCategory.decoration?.status).toBe('over');
    expect(byCategory.decoration?.remaining).toBe(-20_000);
    expect(byCategory.catering?.status).toBe('ok');
  });

  it('treats spending in an unallocated category as overspending', () => {
    const summary = summarizeBudget(600_000, allocations, [makeExpense({ category: 'attire', actualAmount: 1 })]);
    expect(summary.categories.find((row) => row.category === 'attire')?.status).toBe('over');
  });

  it('detects total overspending and handles a zero budget safely', () => {
    expect(summarizeBudget(100, makeAllocations({ venue: 100 }), [makeExpense({ category: 'venue', actualAmount: 150 })]).overBudget).toBe(true);
    expect(summarizeBudget(0, makeAllocations(), []).percentConsumed).toBe(0);
  });
});

describe('reallocation', () => {
  it('suggests covering an overspent category from the unallocated pool first, then from spare money', () => {
    const summary = summarizeBudget(
      550_000,
      makeAllocations({ venue: 100_000, catering: 300_000, decoration: 100_000 }),
      [
        makeExpense({ category: 'decoration', actualAmount: 160_000 }),
        makeExpense({ category: 'catering', actualAmount: 100_000, estimatedAmount: 150_000 }),
      ],
    );
    expect(suggestReallocations(summary)).toEqual([
      { from: 'unallocated', to: 'decoration', amount: 50_000 },
      { from: 'catering', to: 'decoration', amount: 10_000 },
    ]);
  });

  it('never takes money that is already spent or estimated in the donor category', () => {
    const summary = summarizeBudget(
      200_000,
      makeAllocations({ venue: 100_000, catering: 100_000 }),
      [
        makeExpense({ category: 'venue', actualAmount: 130_000 }),
        makeExpense({ category: 'catering', actualAmount: 60_000, estimatedAmount: 90_000 }),
      ],
    );
    const moves = suggestReallocations(summary);
    expect(moves).toEqual([{ from: 'catering', to: 'venue', amount: 10_000 }]);
  });

  it('applies a move without changing the total, and rejects invalid moves', () => {
    const allocations = makeAllocations({ venue: 100, catering: 50 });
    const moved = applyReallocation(allocations, { from: 'venue', to: 'catering', amount: 30 });
    expect(moved.venue).toBe(70);
    expect(moved.catering).toBe(80);
    expect(sumAllocations(moved)).toBe(sumAllocations(allocations));
    expect(() => applyReallocation(allocations, { from: 'venue', to: 'catering', amount: 500 })).toThrow(RangeError);
    expect(() => applyReallocation(allocations, { from: 'venue', to: 'catering', amount: -1 })).toThrow(RangeError);
    expect(applyReallocation(allocations, { from: 'unallocated', to: 'venue', amount: 10 }).venue).toBe(110);
  });
});
