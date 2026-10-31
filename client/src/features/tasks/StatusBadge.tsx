import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { isOverdue } from '@shared/calc/tasks';
import { TASK_STATUS_LABELS } from '@shared/constants';
import type { TaskRecord } from '@shared/types';

/** Completed, overdue, or the plain status text. */
export function StatusBadge({ task, today }: { task: TaskRecord; today: string }) {
  if (task.status === 'completed') {
    return (
      <span className="badge badge-success">
        <CheckCircle2 size={14} aria-hidden="true" /> Completed
      </span>
    );
  }
  if (isOverdue(task, today)) {
    return (
      <span className="badge badge-danger">
        <AlertCircle size={14} aria-hidden="true" /> Overdue
      </span>
    );
  }
  return <span className="badge badge-neutral">{TASK_STATUS_LABELS[task.status]}</span>;
}
