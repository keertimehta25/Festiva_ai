import { Pencil, Plus, Trash2 } from 'lucide-react';
import { BUDGET_CATEGORY_LABELS } from '@shared/constants';
import type { ExpenseRecord, VendorRecord } from '@shared/types';
import { EmptyState } from '../../components/ui/Feedback';
import { formatRupees } from '../../lib/format';

interface ExpensesCardProps {
  expenses: ExpenseRecord[];
  vendors: VendorRecord[];
  onAdd: () => void;
  onEdit: (expense: ExpenseRecord) => void;
  onDelete: (expense: ExpenseRecord) => void;
}

/** Every expense in a table, with add / edit / delete actions. */
export function ExpensesCard({ expenses, vendors, onAdd, onEdit, onDelete }: ExpensesCardProps) {
  const vendorName = (id: string | null) => vendors.find((vendor) => vendor.id === id)?.name ?? '–';

  return (
    <section className="card" aria-labelledby="expenses-heading">
      <div className="card-header">
        <h2 id="expenses-heading">Expenses</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
          <Plus size={16} aria-hidden="true" /> Add expense
        </button>
      </div>
      {expenses.length === 0 ? (
        <EmptyState title="No expenses yet">
          Add what you plan to spend and what you have paid. Totals and warnings update automatically.
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Expenses for this event</caption>
            <thead>
              <tr>
                <th scope="col">Expense</th>
                <th scope="col">Category</th>
                <th scope="col">Vendor</th>
                <th scope="col" className="num">
                  Estimated
                </th>
                <th scope="col" className="num">
                  Actual
                </th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <th scope="row">
                    {expense.title}
                    {expense.notes && <div className="small muted">{expense.notes}</div>}
                  </th>
                  <td>{BUDGET_CATEGORY_LABELS[expense.category]}</td>
                  <td>{vendorName(expense.vendorId)}</td>
                  <td className="num">{formatRupees(expense.estimatedAmount)}</td>
                  <td className="num">{formatRupees(expense.actualAmount)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => {
                          onEdit(expense);
                        }}
                        aria-label={`Edit ${expense.title}`}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => {
                          onDelete(expense);
                        }}
                        aria-label={`Delete ${expense.title}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
