import type { BudgetSummary } from '@shared/calc/budget';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatRupees } from '../../lib/format';

/** Share of the budget spent at which the progress bar turns to a warning. */
const WARNING_PERCENT = 85;

interface StatProps {
  label: string;
  value: string;
  note: string;
  danger?: boolean;
}

function Stat({ label, value, note, danger = false }: StatProps) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={danger ? 'stat-value text-danger' : 'stat-value'}>{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

/** The four headline numbers and the overall progress bar. */
export function BudgetStats({ budget }: { budget: BudgetSummary }) {
  const overspent = budget.remaining < 0;
  const status = budget.overBudget ? 'over' : budget.percentConsumed >= WARNING_PERCENT ? 'warning' : 'ok';

  return (
    <>
      <div className="stat-grid">
        <Stat
          label="Total budget"
          value={formatRupees(budget.totalBudget)}
          note={`${formatRupees(budget.unallocated)} not yet allocated`}
        />
        <Stat
          label="Spent so far"
          value={formatRupees(budget.totalActual)}
          note={`${budget.percentConsumed}% of budget`}
        />
        <Stat
          label="Remaining"
          value={formatRupees(budget.remaining)}
          note={overspent ? 'Over budget' : 'Still available'}
          danger={overspent}
        />
        <Stat label="Estimated total" value={formatRupees(budget.totalEstimated)} note="From expense estimates" />
      </div>
      <ProgressBar label="Share of total budget spent" value={budget.percentConsumed} status={status} />
    </>
  );
}
