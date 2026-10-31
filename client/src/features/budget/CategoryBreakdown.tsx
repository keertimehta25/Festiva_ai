import { Pencil } from 'lucide-react';
import type { BudgetSummary } from '@shared/calc/budget';
import { BUDGET_CATEGORY_LABELS } from '@shared/constants';
import { formatRupees } from '../../lib/format';
import { categoryColor, DonutChart } from './DonutChart';

const STATUS_TEXT = { ok: 'On track', warning: 'Nearly used', over: 'Over budget' } as const;
const STATUS_BADGE = { ok: 'badge-success', warning: 'badge-warning', over: 'badge-danger' } as const;

interface CategoryBreakdownProps {
  budget: BudgetSummary;
  onEdit: () => void;
}

/** Donut chart plus a table of planned, estimated and actual amounts for each category. */
export function CategoryBreakdown({ budget, onEdit }: CategoryBreakdownProps) {
  const rows = budget.categories.filter((row) => row.allocated > 0 || row.actual > 0 || row.estimated > 0);

  return (
    <section className="card" aria-labelledby="alloc-heading">
      <div className="card-header">
        <h2 id="alloc-heading">Budget by category</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
          <Pencil size={16} aria-hidden="true" /> Edit budgets
        </button>
      </div>
      <div className="chart-wrap">
        <DonutChart
          slices={budget.categories.map((row) => ({ category: row.category, amount: row.allocated }))}
          total={budget.totalBudget}
        />
        <div className="table-wrap chart-table">
          <table>
            <caption className="visually-hidden">
              Planned, estimated and actual amounts for each budget category
            </caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" className="num">
                  Planned
                </th>
                <th scope="col" className="num">
                  Estimated
                </th>
                <th scope="col" className="num">
                  Actual
                </th>
                <th scope="col" className="num">
                  Remaining
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.category}>
                  <th scope="row">
                    <span aria-hidden="true" className="swatch" style={{ background: categoryColor(row.category) }} />
                    {BUDGET_CATEGORY_LABELS[row.category]}
                  </th>
                  <td className="num">{formatRupees(row.allocated)}</td>
                  <td className="num">{formatRupees(row.estimated)}</td>
                  <td className="num">{formatRupees(row.actual)}</td>
                  <td className="num">{formatRupees(row.remaining)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[row.status]}`}>{STATUS_TEXT[row.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="num">{formatRupees(budget.totalAllocated)}</td>
                <td className="num">{formatRupees(budget.totalEstimated)}</td>
                <td className="num">{formatRupees(budget.totalActual)}</td>
                <td className="num">{formatRupees(budget.remaining)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
