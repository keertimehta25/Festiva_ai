import { useState, type FormEvent } from 'react';
import {
  PRIORITIES, PRIORITY_LABELS, TASK_CATEGORIES, TASK_CATEGORY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS,
} from '@shared/constants';
import { taskInputSchema } from '@shared/schemas';
import type { TaskRecord, VendorRecord } from '@shared/types';
import { Field } from '../../components/ui/Field';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '../../lib/formErrors';

interface TaskDialogProps { eventId: string; task: TaskRecord | null; vendors: VendorRecord[]; onClose: () => void }

export function TaskDialog({ eventId, task, vendors, onClose }: TaskDialogProps) {
  const [form, setForm] = useState({
    title: task?.title ?? '', description: task?.description ?? '', dueDate: task?.dueDate ?? '', priority: task?.priority ?? 'medium',
    status: task?.status ?? 'pending', category: task?.category ?? 'planning', notes: task?.notes ?? '', vendorId: task?.vendorId ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<unknown>(null);
  const save = useWorkspaceMutation(eventId, (input: ReturnType<typeof taskInputSchema.parse>) =>
    task ? api.updateTask(eventId, task.id, input) : api.createTask(eventId, input));
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const parsed = taskInputSchema.safeParse({ ...form, dueDate: form.dueDate === '' ? null : form.dueDate, vendorId: form.vendorId === '' ? null : form.vendorId });
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
    <Modal title={task ? 'Edit task' : 'Add task'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {failure !== null && <ErrorNotice error={failure} />}
        <Field label="Task" error={errors.title}><input className="input" value={form.title} maxLength={140} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Description" optional error={errors.description}><textarea className="textarea" value={form.description} maxLength={500} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="form-grid">
          <Field label="Due date" optional error={errors.dueDate}><input className="input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
          <Field label="Priority"><select className="select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}</select></Field>
          <Field label="Status"><select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>{TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}</select></Field>
          <Field label="Category"><select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>{TASK_CATEGORIES.map((c) => <option key={c} value={c}>{TASK_CATEGORY_LABELS[c]}</option>)}</select></Field>
          <Field label="Related vendor" optional error={errors.vendorId}>
            <select className="select" value={form.vendorId} onChange={(e) => set('vendorId', e.target.value)}>
              <option value="">None</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes" optional error={errors.notes}><textarea className="textarea" value={form.notes} maxLength={500} onChange={(e) => set('notes', e.target.value)} /></Field>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : task ? 'Save changes' : 'Add task'}</button>
        </div>
      </form>
    </Modal>
  );
}
