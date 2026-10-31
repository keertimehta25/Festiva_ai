import { useState } from 'react';
import { sumAllocations } from '@shared/calc/budget';
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS, type BudgetCategory } from '@shared/constants';
import type { Allocations } from '@shared/schemas';
import type { EventRecord } from '@shared/types';
import { FormDialog, TextField } from '../../components/ui/FormControls';
import { Notice } from '../../components/ui/Notice';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { formatRupees, parseOptionalAmount } from '../../lib/format';

interface AllocationDialogProps {
  event: EventRecord;
  onClose: () => void;
}

type AllocationText = Record<BudgetCategory, string>;

function allocationsToText(allocations: Allocations): AllocationText {
  return Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c, String(allocations[c])])) as AllocationText;
}

function parseAllocations(values: AllocationText): Allocations {
  return Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c, parseOptionalAmount(values[c])])) as Allocations;
}

export function AllocationDialog({ event, onClose }: AllocationDialogProps) {
  const [values, setValues] = useState(() => allocationsToText(event.allocations));
  const [failure, setFailure] = useState<unknown>(null);
  const mutation = useWorkspaceMutation(event.id, (allocations: Allocations) =>
    api.updateEvent(event.id, { allocations }),
  );

  const parsed = parseAllocations(values);
  const invalid = BUDGET_CATEGORIES.filter((c) => !Number.isFinite(parsed[c]));
  const total = invalid.length === 0 ? sumAllocations(parsed) : 0;
  const over = total > event.totalBudget;

  async function submit() {
    if (invalid.length > 0 || over) return;
    try {
      await mutation.mutateAsync(parsed);
      onClose();
    } catch (error) {
      setFailure(error);
    }
  }

  return (
    <FormDialog
      title="Edit category budgets"
      onClose={onClose}
      onSubmit={submit}
      failure={failure}
      pending={mutation.isPending}
      submitDisabled={over || invalid.length > 0}
      submitLabel="Save budgets"
    >
      <div className="form-grid">
        {BUDGET_CATEGORIES.map((c) => (
          <TextField
            key={c}
            label={`${BUDGET_CATEGORY_LABELS[c]} (₹)`}
            numeric
            value={values[c]}
            error={invalid.includes(c) ? 'Enter a whole number' : undefined}
            onChange={(v) => {
              setValues((current) => ({ ...current, [c]: v }));
            }}
          />
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
    </FormDialog>
  );
}
