import {
  PRIORITIES,
  PRIORITY_LABELS,
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from '@shared/constants';
import { taskInputSchema, type TaskInput } from '@shared/schemas';
import type { TaskRecord, VendorRecord } from '@shared/types';
import { FormDialog, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui/FormControls';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { useFormDialog } from '../../hooks/useFormDialog';
import { api } from '../../lib/api';
import { blankToNull } from '../../lib/format';
import { vendorOptions } from '../vendors/vendorOptions';

interface TaskDialogProps {
  eventId: string;
  task: TaskRecord | null;
  vendors: VendorRecord[];
  onClose: () => void;
}

export function TaskDialog({ eventId, task, vendors, onClose }: TaskDialogProps) {
  const mutation = useWorkspaceMutation(eventId, (input: TaskInput) =>
    task ? api.updateTask(eventId, task.id, input) : api.createTask(eventId, input),
  );
  const { form, set, errors, failure, submit } = useFormDialog({
    initial: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.dueDate ?? '',
      priority: task?.priority ?? 'medium',
      status: task?.status ?? 'pending',
      category: task?.category ?? 'planning',
      notes: task?.notes ?? '',
      vendorId: task?.vendorId ?? '',
    },
    schema: taskInputSchema,
    toInput: (values) => ({ ...values, dueDate: blankToNull(values.dueDate), vendorId: blankToNull(values.vendorId) }),
    save: mutation.mutateAsync,
    onDone: onClose,
  });

  return (
    <FormDialog
      title={task ? 'Edit task' : 'Add task'}
      onClose={onClose}
      onSubmit={submit}
      failure={failure}
      pending={mutation.isPending}
      submitLabel={task ? 'Save changes' : 'Add task'}
    >
      <TextField
        label="Task"
        value={form.title}
        maxLength={140}
        error={errors.title}
        onChange={(v) => set('title', v)}
      />
      <TextAreaField
        label="Description"
        optional
        value={form.description}
        maxLength={500}
        error={errors.description}
        onChange={(v) => set('description', v)}
      />
      <div className="form-grid">
        <TextField
          label="Due date"
          optional
          type="date"
          value={form.dueDate}
          error={errors.dueDate}
          onChange={(v) => set('dueDate', v)}
        />
        <SelectField
          label="Priority"
          value={form.priority}
          options={optionsFrom(PRIORITIES, PRIORITY_LABELS)}
          onChange={(v) => set('priority', v)}
        />
        <SelectField
          label="Status"
          value={form.status}
          options={optionsFrom(TASK_STATUSES, TASK_STATUS_LABELS)}
          onChange={(v) => set('status', v)}
        />
        <SelectField
          label="Category"
          value={form.category}
          options={optionsFrom(TASK_CATEGORIES, TASK_CATEGORY_LABELS)}
          onChange={(v) => set('category', v)}
        />
        <SelectField
          label="Related vendor"
          optional
          value={form.vendorId}
          error={errors.vendorId}
          options={vendorOptions(vendors, 'None')}
          onChange={(v) => set('vendorId', v)}
        />
      </div>
      <TextAreaField
        label="Notes"
        optional
        value={form.notes}
        maxLength={500}
        error={errors.notes}
        onChange={(v) => set('notes', v)}
      />
    </FormDialog>
  );
}
