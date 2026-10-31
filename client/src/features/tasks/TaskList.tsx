import { Pencil, Trash2 } from 'lucide-react';
import { PRIORITY_LABELS, TASK_CATEGORY_LABELS } from '@shared/constants';
import type { TaskRecord } from '@shared/types';
import { formatDate } from '../../lib/format';
import { StatusBadge } from './StatusBadge';

const PRIORITY_BADGE = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-neutral' } as const;

interface TaskListProps {
  tasks: TaskRecord[];
  today: string;
  /** True while a status change is being saved. */
  busy: boolean;
  onToggleDone: (task: TaskRecord) => void;
  onEdit: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
}

/** Tasks as a checklist, with badges and edit / delete buttons. */
export function TaskList({ tasks, today, busy, onToggleDone, onEdit, onDelete }: TaskListProps) {
  return (
    <ul className="list-plain">
      {tasks.map((task) => (
        <li key={task.id}>
          <div className="row-between">
            <label className="option option-bare">
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                onChange={() => {
                  onToggleDone(task);
                }}
                disabled={busy}
              />
              <span className={task.status === 'completed' ? 'task-done' : undefined}>{task.title}</span>
            </label>
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => {
                  onEdit(task);
                }}
                aria-label={`Edit ${task.title}`}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => {
                  onDelete(task);
                }}
                aria-label={`Delete ${task.title}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="event-meta mt-sm">
            <StatusBadge task={task} today={today} />
            <span className={`badge ${PRIORITY_BADGE[task.priority]}`}>{PRIORITY_LABELS[task.priority]} priority</span>
            <span className="badge badge-neutral">{TASK_CATEGORY_LABELS[task.category]}</span>
            <span className="badge badge-neutral">Due {formatDate(task.dueDate)}</span>
          </div>
          {task.description && <p className="small muted mt-sm">{task.description}</p>}
          {task.notes && <p className="small mt-xs">Note: {task.notes}</p>}
        </li>
      ))}
    </ul>
  );
}
