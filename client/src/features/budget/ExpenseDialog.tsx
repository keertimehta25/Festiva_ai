import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS } from '@shared/constants';
import { expenseInputSchema, type ExpenseInput } from '@shared/schemas';
import type { ExpenseRecord, VendorRecord } from '@shared/types';
import { FormDialog, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui/FormControls';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { useFormDialog } from '../../hooks/useFormDialog';
import { api } from '../../lib/api';
import { amountToText, blankToNull, parseOptionalAmount } from '../../lib/format';
import { vendorOptions } from '../vendors/vendorOptions';

interface ExpenseDialogProps {
  eventId: string;
  expense: ExpenseRecord | null;
  vendors: VendorRecord[];
  onClose: () => void;
}

export function ExpenseDialog({ eventId, expense, vendors, onClose }: ExpenseDialogProps) {
  const mutation = useWorkspaceMutation(eventId, (input: ExpenseInput) =>
    expense ? api.updateExpense(eventId, expense.id, input) : api.createExpense(eventId, input),
  );
  const { form, set, errors, failure, submit } = useFormDialog({
    initial: {
      title: expense?.title ?? '',
      category: expense?.category ?? 'miscellaneous',
      estimatedAmount: amountToText(expense?.estimatedAmount),
      actualAmount: amountToText(expense?.actualAmount),
      vendorId: expense?.vendorId ?? '',
      notes: expense?.notes ?? '',
    },
    schema: expenseInputSchema,
    toInput: (values) => ({
      ...values,
      estimatedAmount: parseOptionalAmount(values.estimatedAmount),
      actualAmount: parseOptionalAmount(values.actualAmount),
      vendorId: blankToNull(values.vendorId),
    }),
    save: mutation.mutateAsync,
    onDone: onClose,
  });

  return (
    <FormDialog
      title={expense ? 'Edit expense' : 'Add expense'}
      onClose={onClose}
      onSubmit={submit}
      failure={failure}
      pending={mutation.isPending}
      submitLabel={expense ? 'Save changes' : 'Add expense'}
    >
      <TextField
        label="What is it for?"
        value={form.title}
        maxLength={120}
        error={errors.title}
        onChange={(v) => set('title', v)}
      />
      <div className="form-grid">
        <SelectField
          label="Category"
          value={form.category}
          error={errors.category}
          options={optionsFrom(BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS)}
          onChange={(v) => set('category', v)}
        />
        <SelectField
          label="Vendor"
          optional
          value={form.vendorId}
          error={errors.vendorId}
          options={vendorOptions(vendors, 'No vendor')}
          onChange={(v) => set('vendorId', v)}
        />
        <TextField
          label="Estimated amount (₹)"
          optional
          numeric
          value={form.estimatedAmount}
          error={errors.estimatedAmount}
          hint="What you expect to spend."
          onChange={(v) => set('estimatedAmount', v)}
        />
        <TextField
          label="Actual amount paid (₹)"
          optional
          numeric
          value={form.actualAmount}
          error={errors.actualAmount}
          hint="What you have actually spent so far."
          onChange={(v) => set('actualAmount', v)}
        />
      </div>
      <TextAreaField
        label="Notes"
        optional
        value={form.notes}
        maxLength={300}
        error={errors.notes}
        onChange={(v) => set('notes', v)}
      />
    </FormDialog>
  );
}
