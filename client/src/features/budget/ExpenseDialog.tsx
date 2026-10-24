import { useState, type FormEvent } from 'react';
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABELS } from '@shared/constants';
import { expenseInputSchema } from '@shared/schemas';
import type { ExpenseRecord, VendorRecord } from '@shared/types';
import { Field } from '../../components/ui/Field';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '../../lib/formErrors';
import { parseWholeNumber } from '../../lib/format';

interface ExpenseDialogProps {
  eventId: string;
  expense: ExpenseRecord | null;
  vendors: VendorRecord[];
  onClose: () => void;
}

/** Empty means 0 (an expense can have only an estimate or only an actual amount). */
const toAmount = (value: string): number => (value.trim() === '' ? 0 : parseWholeNumber(value));

export function ExpenseDialog({ eventId, expense, vendors, onClose }: ExpenseDialogProps) {
  const [form, setForm] = useState({
    title: expense?.title ?? '', category: expense?.category ?? 'miscellaneous',
    estimatedAmount: expense && expense.estimatedAmount > 0 ? String(expense.estimatedAmount) : '',
    actualAmount: expense && expense.actualAmount > 0 ? String(expense.actualAmount) : '',
    vendorId: expense?.vendorId ?? '', notes: expense?.notes ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<unknown>(null);
  const save = useWorkspaceMutation(eventId, (input: ReturnType<typeof expenseInputSchema.parse>) =>
    expense ? api.updateExpense(eventId, expense.id, input) : api.createExpense(eventId, input));
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const parsed = expenseInputSchema.safeParse({
      title: form.title, category: form.category, estimatedAmount: toAmount(form.estimatedAmount),
      actualAmount: toAmount(form.actualAmount), vendorId: form.vendorId === '' ? null : form.vendorId, notes: form.notes,
    });
    if (!parsed.success) return setErrors(fieldErrorsFromZod(parsed.error));
    setErrors({});
    try {
      await save.mutateAsync(parsed.data);
      onClose();
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setFailure(error);
    }
  }

  return (
    <Modal title={expense ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {failure !== null && <ErrorNotice error={failure} />}
        <Field label="What is it for?" error={errors.title}><input className="input" value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} /></Field>
        <div className="form-grid">
          <Field label="Category" error={errors.category}>
            <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{BUDGET_CATEGORY_LABELS[c]}</option>)}
            </select>
          </Field>
          <Field label="Vendor" optional error={errors.vendorId}>
            <select className="select" value={form.vendorId} onChange={(e) => set('vendorId', e.target.value)}>
              <option value="">No vendor</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Estimated amount (₹)" optional error={errors.estimatedAmount} hint="What you expect to spend.">
            <input className="input" inputMode="numeric" value={form.estimatedAmount} onChange={(e) => set('estimatedAmount', e.target.value)} />
          </Field>
          <Field label="Actual amount paid (₹)" optional error={errors.actualAmount} hint="What you have actually spent so far.">
            <input className="input" inputMode="numeric" value={form.actualAmount} onChange={(e) => set('actualAmount', e.target.value)} />
          </Field>
        </div>
        <Field label="Notes" optional error={errors.notes}><textarea className="textarea" value={form.notes} maxLength={300} onChange={(e) => set('notes', e.target.value)} /></Field>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : expense ? 'Save changes' : 'Add expense'}</button>
        </div>
      </form>
    </Modal>
  );
}
