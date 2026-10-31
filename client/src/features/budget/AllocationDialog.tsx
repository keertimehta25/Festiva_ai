import { useState, type SyntheticEvent } from 'react';
import { sumAllocations } from '@shared/calc/budget';
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS, type BudgetCategory } from '@shared/constants';
import type { Allocations } from '@shared/schemas';
import type { EventRecord } from '@shared/types';
import { Field } from '../../components/ui/Field';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { Notice } from '../../components/ui/Notice';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { formatRupees, parseWholeNumber } from '../../lib/format';

export function AllocationDialog({ event, onClose }: { event: EventRecord; onClose: () => void }) {
  const [values, setValues] = useState<Record<BudgetCategory, string>>(
    () =>
      Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c, String(event.allocations[c])])) as Record<
        BudgetCategory,
        string
      >,
  );
  const [failure, setFailure] = useState<unknown>(null);
  const save = useWorkspaceMutation(event.id, (allocations: Allocations) => api.updateEvent(event.id, { allocations }));

  const parsed = Object.fromEntries(
    BUDGET_CATEGORIES.map((c) => [c, values[c].trim() === '' ? 0 : parseWholeNumber(values[c])]),
  ) as Allocations;
  const invalid = BUDGET_CATEGORIES.filter((c) => !Number.isFinite(parsed[c]));
  const total = invalid.length === 0 ? sumAllocations(parsed) : 0;
  const over = total > event.totalBudget;

  async function handleSubmit(submit: SyntheticEvent) {
    submit.preventDefault();
    if (invalid.length > 0 || over) return;
    try {
      await save.mutateAsync(parsed);
      onClose();
    } catch (error) {
      setFailure(error);
    }
  }

  return (
    <Modal title="Edit category budgets" onClose={onClose}>
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        {failure !== null && <ErrorNotice error={failure} />}
        <div className="form-grid">
          {BUDGET_CATEGORIES.map((c) => (
            <Field
              key={c}
              label={`${BUDGET_CATEGORY_LABELS[c]} (₹)`}
              error={invalid.includes(c) ? 'Enter a whole number' : undefined}
            >
              <input
                className="input"
                inputMode="numeric"
                value={values[c]}
                onChange={(e) => setValues((cur) => ({ ...cur, [c]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
        <div aria-live="polite">
          {over ? (
            <Notice tone="danger">
              <p>
                Categories add up to {formatRupees(total)}, which is {formatRupees(total - event.totalBudget)} more than
                your total budget of {formatRupees(event.totalBudget)}.
              </p>
            </Notice>
          ) : (
            <p className="muted">
              Allocated {formatRupees(total)} of {formatRupees(event.totalBudget)}. Unallocated:{' '}
              {formatRupees(event.totalBudget - total)}.
            </p>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending || over || invalid.length > 0}>
            {save.isPending ? 'Saving…' : 'Save budgets'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
