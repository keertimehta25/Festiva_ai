import { useMutation } from '@tanstack/react-query';
import { Lightbulb, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { applyReallocation, summarizeBudget, suggestReallocations, type ReallocationSuggestion } from '@shared/calc/budget';
import { BUDGET_CATEGORY_LABELS } from '@shared/constants';
import type { AiSavings } from '@shared/schemas';
import type { ExpenseRecord, Workspace } from '@shared/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback';
import { Notice } from '../../components/ui/Notice';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useToast } from '../../components/ui/Toasts';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { formatRupees } from '../../lib/format';
import { AllocationDialog } from './AllocationDialog';
import { categoryColor, DonutChart } from './DonutChart';
import { ExpenseDialog } from './ExpenseDialog';

const STATUS_TEXT = { ok: 'On track', warning: 'Nearly used', over: 'Over budget' } as const;
const STATUS_BADGE = { ok: 'badge-success', warning: 'badge-warning', over: 'badge-danger' } as const;
const sourceLabel = (from: ReallocationSuggestion['from']) => (from === 'unallocated' ? 'unallocated funds' : BUDGET_CATEGORY_LABELS[from]);

export default function BudgetTab({ workspace }: { workspace: Workspace }) {
  const { event, expenses, vendors } = workspace;
  const toast = useToast();
  const budget = summarizeBudget(event.totalBudget, event.allocations, expenses);
  const suggestions = suggestReallocations(budget);
  const flagged = budget.categories.filter((row) => row.status !== 'ok');

  const [expenseDialog, setExpenseDialog] = useState<{ expense: ExpenseRecord | null } | null>(null);
  const [editingAllocations, setEditingAllocations] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseRecord | null>(null);

  const removeExpense = useWorkspaceMutation(event.id, (id: string) => api.deleteExpense(event.id, id));
  const reallocate = useWorkspaceMutation(event.id, (move: ReallocationSuggestion) =>
    api.updateEvent(event.id, { allocations: applyReallocation(event.allocations, move) }));
  const savings = useMutation<AiSavings>({ mutationFn: () => api.suggestSavings(event.id) });

  return (
    <div className="stack">
      <div className="stat-grid">
        <div className="stat"><div className="stat-label">Total budget</div><div className="stat-value">{formatRupees(budget.totalBudget)}</div><div className="stat-note">{formatRupees(budget.unallocated)} not yet allocated</div></div>
        <div className="stat"><div className="stat-label">Spent so far</div><div className="stat-value">{formatRupees(budget.totalActual)}</div><div className="stat-note">{budget.percentConsumed}% of budget</div></div>
        <div className="stat"><div className="stat-label">Remaining</div><div className="stat-value" style={budget.remaining < 0 ? { color: 'var(--rose)' } : undefined}>{formatRupees(budget.remaining)}</div><div className="stat-note">{budget.remaining < 0 ? 'Over budget' : 'Still available'}</div></div>
        <div className="stat"><div className="stat-label">Estimated total</div><div className="stat-value">{formatRupees(budget.totalEstimated)}</div><div className="stat-note">From expense estimates</div></div>
      </div>
      <ProgressBar label="Share of total budget spent" value={budget.percentConsumed} status={budget.overBudget ? 'over' : budget.percentConsumed >= 85 ? 'warning' : 'ok'} />

      {flagged.length > 0 && (
        <Notice tone={flagged.some((row) => row.status === 'over') ? 'danger' : 'warning'} live>
          <p><strong>Budget alerts</strong></p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {flagged.map((row) => (
              <li key={row.category}>
                {BUDGET_CATEGORY_LABELS[row.category]}: {row.status === 'over' ? `over by ${formatRupees(-row.remaining)}` : `${row.percentUsed}% of ${formatRupees(row.allocated)} used`}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      {suggestions.length > 0 && (
        <section className="card" aria-labelledby="realloc-heading">
          <h2 id="realloc-heading">Reallocation suggestions</h2>
          <p className="muted small">Calculated from your own numbers. Each move only uses money not already spent or estimated elsewhere.</p>
          <ul className="list-plain">
            {suggestions.map((move) => (
              <li key={`${move.from}-${move.to}`} className="row-between">
                <span>Move {formatRupees(move.amount)} from {sourceLabel(move.from)} to {BUDGET_CATEGORY_LABELS[move.to]}</span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={reallocate.isPending}
                  onClick={() => reallocate.mutate(move, { onSuccess: () => toast.success('Budget updated'), onError: (e) => toast.error(e.message) })}>
                  Apply
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" aria-labelledby="alloc-heading">
        <div className="card-header">
          <h2 id="alloc-heading">Budget by category</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingAllocations(true)}><Pencil size={16} aria-hidden="true" /> Edit budgets</button>
        </div>
        <div className="chart-wrap">
          <DonutChart slices={budget.categories.map((row) => ({ category: row.category, amount: row.allocated }))} total={budget.totalBudget} />
          <div className="table-wrap" style={{ flex: 1, minWidth: 280 }}>
            <table>
              <caption className="visually-hidden">Planned, estimated and actual amounts for each budget category</caption>
              <thead><tr><th scope="col">Category</th><th scope="col" className="num">Planned</th><th scope="col" className="num">Estimated</th><th scope="col" className="num">Actual</th><th scope="col" className="num">Remaining</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {budget.categories.filter((row) => row.allocated > 0 || row.actual > 0 || row.estimated > 0).map((row) => (
                  <tr key={row.category}>
                    <th scope="row"><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: categoryColor(row.category), marginRight: 8 }} />{BUDGET_CATEGORY_LABELS[row.category]}</th>
                    <td className="num">{formatRupees(row.allocated)}</td>
                    <td className="num">{formatRupees(row.estimated)}</td>
                    <td className="num">{formatRupees(row.actual)}</td>
                    <td className="num">{formatRupees(row.remaining)}</td>
                    <td><span className={`badge ${STATUS_BADGE[row.status]}`}>{STATUS_TEXT[row.status]}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th scope="row">Total</th><td className="num">{formatRupees(budget.totalAllocated)}</td><td className="num">{formatRupees(budget.totalEstimated)}</td><td className="num">{formatRupees(budget.totalActual)}</td><td className="num">{formatRupees(budget.remaining)}</td><td /></tr></tfoot>
            </table>
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="expenses-heading">
        <div className="card-header">
          <h2 id="expenses-heading">Expenses</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setExpenseDialog({ expense: null })}><Plus size={16} aria-hidden="true" /> Add expense</button>
        </div>
        {expenses.length === 0 ? (
          <EmptyState title="No expenses yet">Add what you plan to spend and what you have paid. Totals and warnings update automatically.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <caption className="visually-hidden">Expenses for this event</caption>
              <thead><tr><th scope="col">Expense</th><th scope="col">Category</th><th scope="col">Vendor</th><th scope="col" className="num">Estimated</th><th scope="col" className="num">Actual</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <th scope="row">{expense.title}{expense.notes && <div className="small muted">{expense.notes}</div>}</th>
                    <td>{BUDGET_CATEGORY_LABELS[expense.category]}</td>
                    <td>{vendors.find((v) => v.id === expense.vendorId)?.name ?? '–'}</td>
                    <td className="num">{formatRupees(expense.estimatedAmount)}</td>
                    <td className="num">{formatRupees(expense.actualAmount)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setExpenseDialog({ expense })} aria-label={`Edit ${expense.title}`}><Pencil size={16} aria-hidden="true" /></button>
                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleting(expense)} aria-label={`Delete ${expense.title}`}><Trash2 size={16} aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="savings-heading">
        <div className="card-header">
          <h2 id="savings-heading">AI cost-saving ideas</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => savings.mutate()} disabled={savings.isPending}>
            <Sparkles size={16} aria-hidden="true" /> {savings.isPending ? 'Thinking…' : savings.data ? 'Refresh ideas' : 'Get ideas'}
          </button>
        </div>
        {savings.error && <ErrorNotice error={savings.error} onRetry={() => savings.mutate()} />}
        {savings.data ? (
          <>
            <p className="muted small">AI-generated suggestions based on your numbers. Check any saving with your vendors before relying on it.</p>
            <ul className="list-plain">
              {savings.data.ideas.map((idea) => (
                <li key={idea.title}><strong><Lightbulb size={16} aria-hidden="true" className="icon-inline" /> {idea.title}</strong> <span className="badge badge-neutral">{BUDGET_CATEGORY_LABELS[idea.category]}</span><p style={{ margin: '0.25rem 0 0' }}>{idea.detail}</p></li>
              ))}
            </ul>
          </>
        ) : !savings.error && <p className="muted">Ask the AI for specific ways to save, based on where you are close to or over your limits.</p>}
      </section>

      {expenseDialog && <ExpenseDialog eventId={event.id} expense={expenseDialog.expense} vendors={vendors} onClose={() => setExpenseDialog(null)} />}
      {editingAllocations && <AllocationDialog event={event} onClose={() => setEditingAllocations(false)} />}
      {deleting && (
        <ConfirmDialog title="Delete this expense?" message={`“${deleting.title}” will be removed and your totals will update.`} confirmLabel="Delete expense" busy={removeExpense.isPending}
          onConfirm={() => removeExpense.mutate(deleting.id, { onSuccess: () => { toast.success('Expense deleted'); setDeleting(null); }, onError: (e) => { toast.error(e.message); setDeleting(null); } })}
          onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
