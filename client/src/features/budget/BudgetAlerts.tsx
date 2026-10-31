import type { BudgetSummary } from '@shared/calc/budget';
import { BUDGET_CATEGORY_LABELS } from '@shared/constants';
import { Notice } from '../../components/ui/Notice';
import { formatRupees } from '../../lib/format';

/** Lists categories that are close to or over their allocation. Renders nothing when all is well. */
export function BudgetAlerts({ budget }: { budget: BudgetSummary }) {
  const flagged = budget.categories.filter((row) => row.status !== 'ok');
  if (flagged.length === 0) return null;

  return (
    <Notice tone={flagged.some((row) => row.status === 'over') ? 'danger' : 'warning'} live>
      <p>
        <strong>Budget alerts</strong>
      </p>
      <ul className="tight-list">
        {flagged.map((row) => (
          <li key={row.category}>
            {BUDGET_CATEGORY_LABELS[row.category]}:{' '}
            {row.status === 'over'
              ? `over by ${formatRupees(-row.remaining)}`
              : `${row.percentUsed}% of ${formatRupees(row.allocated)} used`}
          </li>
        ))}
      </ul>
    </Notice>
  );
}
