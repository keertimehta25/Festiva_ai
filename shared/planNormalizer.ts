import { allocationsFromPercents } from './calc/budget';
import type { AiPlan } from './schemas';
import type { StoredPlan } from './types';

/**
 * Takes the validated model output and attaches values computed by application code:
 * rupee amounts for each category (from the model's percentages) and the total of the
 * model's itemised estimates. The model is never trusted to do arithmetic.
 */
export function normalizePlan(plan: AiPlan, totalBudget: number, model: string): StoredPlan {
  const percents: Record<string, number> = {};
  for (const row of plan.budgetAllocation) {
    percents[row.category] = (percents[row.category] ?? 0) + row.percent;
  }
  const allocationAmounts = allocationsFromPercents(percents, totalBudget);

  const estimatedTotal = plan.expenseEstimates.reduce((total, item) => total + Math.round(item.estimatedAmount), 0);
  const budgetWarning =
    estimatedTotal > totalBudget
      ? 'The AI’s itemised estimates add up to more than your budget. Treat them as a rough guide and review each line.'
      : null;

  return {
    ...plan,
    expenseEstimates: plan.expenseEstimates.map((item) => ({
      ...item,
      estimatedAmount: Math.round(item.estimatedAmount),
    })),
    model,
    allocationAmounts,
    estimatedTotal,
    budgetWarning,
  };
}
