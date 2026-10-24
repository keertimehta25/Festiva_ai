import { BUDGET_CATEGORIES, DEFAULT_ALLOCATION_PERCENT, type BudgetCategory, type EventType } from '../constants';
import type { Allocations } from '../schemas';
import type { ExpenseRecord } from '../types';

/** Spending at or above this share of a category's allocation triggers a warning. */
export const WARNING_THRESHOLD = 0.85;

export type CategoryStatus = 'ok' | 'warning' | 'over';

export interface CategoryBudget {
  category: BudgetCategory;
  allocated: number;
  estimated: number;
  actual: number;
  /** Allocation minus actual spend; negative when over budget. */
  remaining: number;
  /** Share of the allocation already spent (0 when nothing is allocated or spent). */
  percentUsed: number;
  status: CategoryStatus;
}

export interface BudgetSummary {
  totalBudget: number;
  totalAllocated: number;
  /** Part of the total budget not yet assigned to any category. */
  unallocated: number;
  totalEstimated: number;
  totalActual: number;
  remaining: number;
  percentConsumed: number;
  overBudget: boolean;
  categories: CategoryBudget[];
}

export interface ReallocationSuggestion {
  from: BudgetCategory | 'unallocated';
  to: BudgetCategory;
  amount: number;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function sumAllocations(allocations: Allocations): number {
  return BUDGET_CATEGORIES.reduce((total, category) => total + allocations[category], 0);
}

function categoryStatus(allocated: number, actual: number): CategoryStatus {
  if (actual > allocated) return 'over';
  if (allocated > 0 && actual >= allocated * WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

export function summarizeBudget(totalBudget: number, allocations: Allocations, expenses: ExpenseRecord[]): BudgetSummary {
  const categories = BUDGET_CATEGORIES.map((category): CategoryBudget => {
    const inCategory = expenses.filter((expense) => expense.category === category);
    const allocated = allocations[category];
    const actual = inCategory.reduce((total, expense) => total + expense.actualAmount, 0);
    const estimated = inCategory.reduce((total, expense) => total + expense.estimatedAmount, 0);
    return {
      category,
      allocated,
      estimated,
      actual,
      remaining: allocated - actual,
      percentUsed: allocated > 0 ? round1((actual / allocated) * 100) : 0,
      status: categoryStatus(allocated, actual),
    };
  });

  const totalAllocated = sumAllocations(allocations);
  const totalActual = categories.reduce((total, row) => total + row.actual, 0);
  const totalEstimated = categories.reduce((total, row) => total + row.estimated, 0);

  return {
    totalBudget,
    totalAllocated,
    unallocated: totalBudget - totalAllocated,
    totalEstimated,
    totalActual,
    remaining: totalBudget - totalActual,
    percentConsumed: totalBudget > 0 ? round1((totalActual / totalBudget) * 100) : 0,
    overBudget: totalActual > totalBudget,
    categories,
  };
}

/**
 * Turns percentages into whole-rupee amounts that add up exactly to `total`.
 * Negative or missing values count as zero. Rounding leftovers go to the largest category.
 */
export function allocationsFromPercents(percents: Partial<Record<BudgetCategory, number>>, total: number): Allocations {
  const weights = BUDGET_CATEGORIES.map((category) => Math.max(0, percents[category] ?? 0));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) throw new RangeError('At least one category needs a positive share');

  const amounts = weights.map((weight) => Math.floor((total * weight) / weightSum));
  const leftover = total - amounts.reduce((sum, amount) => sum + amount, 0);
  const largestIndex = weights.indexOf(Math.max(...weights));
  amounts[largestIndex] = (amounts[largestIndex] ?? 0) + leftover;

  return Object.fromEntries(BUDGET_CATEGORIES.map((category, index) => [category, amounts[index] ?? 0])) as Allocations;
}

export function defaultAllocations(eventType: EventType, totalBudget: number): Allocations {
  return allocationsFromPercents(DEFAULT_ALLOCATION_PERCENT[eventType], totalBudget);
}

/** Rescales existing allocations to a new total budget, keeping their proportions. */
export function scaleAllocations(allocations: Allocations, eventType: EventType, newTotal: number): Allocations {
  return sumAllocations(allocations) > 0
    ? allocationsFromPercents(allocations, newTotal)
    : defaultAllocations(eventType, newTotal);
}

/** Moves money between categories (or from the unallocated pool) without ever going negative. */
export function applyReallocation(allocations: Allocations, move: ReallocationSuggestion): Allocations {
  if (!Number.isInteger(move.amount) || move.amount <= 0) throw new RangeError('Amount must be a positive whole number');
  const next = { ...allocations };
  if (move.from !== 'unallocated') {
    if (next[move.from] < move.amount) throw new RangeError('Not enough allocated in the source category');
    next[move.from] -= move.amount;
  }
  next[move.to] += move.amount;
  return next;
}

/**
 * Suggests how to cover overspent categories using money that is not needed elsewhere:
 * first the unallocated pool, then categories whose allocation exceeds both their actual
 * and their estimated spending.
 */
export function suggestReallocations(summary: BudgetSummary): ReallocationSuggestion[] {
  const suggestions: ReallocationSuggestion[] = [];
  let pool = Math.max(0, summary.unallocated);
  const donors = summary.categories
    .map((row) => ({ category: row.category, spare: row.allocated - Math.max(row.actual, row.estimated) }))
    .filter((donor) => donor.spare > 0)
    .sort((a, b) => b.spare - a.spare);

  for (const row of summary.categories.filter((candidate) => candidate.status === 'over')) {
    let deficit = row.actual - row.allocated;

    if (pool > 0 && deficit > 0) {
      const amount = Math.min(pool, deficit);
      suggestions.push({ from: 'unallocated', to: row.category, amount });
      pool -= amount;
      deficit -= amount;
    }
    for (const donor of donors) {
      if (deficit <= 0) break;
      if (donor.category === row.category || donor.spare <= 0) continue;
      const amount = Math.min(donor.spare, deficit);
      suggestions.push({ from: donor.category, to: row.category, amount });
      donor.spare -= amount;
      deficit -= amount;
    }
  }
  return suggestions;
}
