import { useState } from 'react';
import { summarizeBudget } from '@shared/calc/budget';
import type { ExpenseRecord, Workspace } from '@shared/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toasts';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { AllocationDialog } from './AllocationDialog';
import { BudgetAlerts } from './BudgetAlerts';
import { BudgetStats } from './BudgetStats';
import { CategoryBreakdown } from './CategoryBreakdown';
import { ExpenseDialog } from './ExpenseDialog';
import { ExpensesCard } from './ExpensesCard';
import { ReallocationSuggestions } from './ReallocationSuggestions';
import { SavingsIdeas } from './SavingsIdeas';

export default function BudgetTab({ workspace }: { workspace: Workspace }) {
  const { event, expenses, vendors } = workspace;
  const toast = useToast();
  const budget = summarizeBudget(event.totalBudget, event.allocations, expenses);

  // `null` means the dialog is closed; an `expense: null` entry means "add a new one".
  const [expenseDialog, setExpenseDialog] = useState<{ expense: ExpenseRecord | null } | null>(null);
  const [editingAllocations, setEditingAllocations] = useState(false);
  const [deleting, setDeleting] = useState<ExpenseRecord | null>(null);
  const removeExpense = useWorkspaceMutation(event.id, (id: string) => api.deleteExpense(event.id, id));

  const confirmDelete = (expense: ExpenseRecord) => {
    removeExpense.mutate(expense.id, {
      onSuccess: () => {
        toast.success('Expense deleted');
        setDeleting(null);
      },
      onError: (error) => {
        toast.error(error.message);
        setDeleting(null);
      },
    });
  };

  return (
    <div className="stack">
      <BudgetStats budget={budget} />
      <BudgetAlerts budget={budget} />
      <ReallocationSuggestions event={event} budget={budget} />
      <CategoryBreakdown
        budget={budget}
        onEdit={() => {
          setEditingAllocations(true);
        }}
      />
      <ExpensesCard
        expenses={expenses}
        vendors={vendors}
        onAdd={() => {
          setExpenseDialog({ expense: null });
        }}
        onEdit={(expense) => {
          setExpenseDialog({ expense });
        }}
        onDelete={setDeleting}
      />
      <SavingsIdeas eventId={event.id} />

      {expenseDialog && (
        <ExpenseDialog
          eventId={event.id}
          expense={expenseDialog.expense}
          vendors={vendors}
          onClose={() => {
            setExpenseDialog(null);
          }}
        />
      )}
      {editingAllocations && (
        <AllocationDialog
          event={event}
          onClose={() => {
            setEditingAllocations(false);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this expense?"
          message={`“${deleting.title}” will be removed and your totals will update.`}
          confirmLabel="Delete expense"
          busy={removeExpense.isPending}
          onConfirm={() => {
            confirmDelete(deleting);
          }}
          onCancel={() => {
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
