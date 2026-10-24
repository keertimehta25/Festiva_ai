import { AlertCircle, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { filterTasks, isOverdue, sortChronologically, taskProgress, upcomingTasks, type TaskFilter } from '@shared/calc/tasks';
import {
  PRIORITIES, PRIORITY_LABELS, TASK_CATEGORIES, TASK_CATEGORY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS,
  type Priority, type TaskCategory, type TaskStatus,
} from '@shared/constants';
import type { TaskRecord, Workspace } from '@shared/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/Feedback';
import { Notice } from '../../components/ui/Notice';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useToast } from '../../components/ui/Toasts';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { getToday } from '../../hooks/useToday';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { TaskDialog } from './TaskDialog';

function StatusBadge({ task, today }: { task: TaskRecord; today: string }) {
  if (task.status === 'completed') return <span className="badge badge-success"><CheckCircle2 size={14} aria-hidden="true" /> Completed</span>;
  if (isOverdue(task, today)) return <span className="badge badge-danger"><AlertCircle size={14} aria-hidden="true" /> Overdue</span>;
  return <span className="badge badge-neutral">{TASK_STATUS_LABELS[task.status]}</span>;
}

const PRIORITY_BADGE = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-neutral' } as const;

export default function TasksTab({ workspace }: { workspace: Workspace }) {
  const { event, tasks, vendors } = workspace;
  const today = getToday();
  const toast = useToast();
  const [filter, setFilter] = useState<TaskFilter>({});
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [dialog, setDialog] = useState<{ task: TaskRecord | null } | null>(null);
  const [deleting, setDeleting] = useState<TaskRecord | null>(null);

  const progress = taskProgress(tasks);
  const overdueCount = tasks.filter((task) => isOverdue(task, today)).length;
  const dueSoon = upcomingTasks(tasks, today, 7).length;
  const visible = sortChronologically(filterTasks(tasks, filter));

  const update = useWorkspaceMutation(event.id, ({ id, patch }: { id: string; patch: Partial<Pick<TaskRecord, 'status'>> }) => api.updateTask(event.id, id, patch));
  const remove = useWorkspaceMutation(event.id, (id: string) => api.deleteTask(event.id, id));

  const setFilterValue = <K extends keyof TaskFilter>(key: K, value: TaskFilter[K] | '') => setFilter((current) => ({ ...current, [key]: value === '' ? undefined : value }));
  const toggleDone = (task: TaskRecord) =>
    update.mutate({ id: task.id, patch: { status: task.status === 'completed' ? 'pending' : 'completed' } }, { onError: (e) => toast.error(e.message) });

  return (
    <div className="stack">
      <div className="card">
        <div className="row-between">
          <div><h2 style={{ margin: 0 }}>{progress.percent}% complete</h2><p className="muted" style={{ margin: 0 }}>{progress.completed} of {progress.total} tasks done · {progress.inProgress} in progress</p></div>
          <button type="button" className="btn btn-primary" onClick={() => setDialog({ task: null })}><Plus size={18} aria-hidden="true" /> Add task</button>
        </div>
        <ProgressBar label="Task completion" value={progress.percent} />
      </div>

      {overdueCount > 0 && <Notice tone="danger" live><p><strong>{overdueCount} overdue task{overdueCount > 1 ? 's' : ''}.</strong> Finish them or move their due dates.</p></Notice>}
      {dueSoon > 0 && <Notice tone="warning"><p>{dueSoon} task{dueSoon > 1 ? 's' : ''} due in the next 7 days.</p></Notice>}

      <section className="card" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="visually-hidden">Task list</h2>
        <div className="toolbar">
          <div className="field"><label htmlFor="f-status">Status</label>
            <select id="f-status" className="select" value={filter.status ?? ''} onChange={(e) => setFilterValue('status', e.target.value as TaskStatus | '')}>
              <option value="">All</option>{TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
            </select></div>
          <div className="field"><label htmlFor="f-category">Category</label>
            <select id="f-category" className="select" value={filter.category ?? ''} onChange={(e) => setFilterValue('category', e.target.value as TaskCategory | '')}>
              <option value="">All</option>{TASK_CATEGORIES.map((c) => <option key={c} value={c}>{TASK_CATEGORY_LABELS[c]}</option>)}
            </select></div>
          <div className="field"><label htmlFor="f-priority">Priority</label>
            <select id="f-priority" className="select" value={filter.priority ?? ''} onChange={(e) => setFilterValue('priority', e.target.value as Priority | '')}>
              <option value="">All</option>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select></div>
          <div role="group" aria-label="View" style={{ display: 'flex', gap: 4 }}>
            <button type="button" className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
            <button type="button" className={`btn btn-sm ${view === 'timeline' ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>Timeline</button>
          </div>
        </div>
        <p className="muted small" role="status">Showing {visible.length} of {tasks.length} tasks</p>

        {tasks.length === 0 ? <EmptyState title="No tasks yet">Add your first task, or generate a timeline from the AI plan.</EmptyState>
          : visible.length === 0 ? <EmptyState title="No tasks match these filters">Clear a filter to see more.</EmptyState>
          : view === 'list' ? (
            <ul className="list-plain">
              {visible.map((task) => (
                <li key={task.id}>
                  <div className="row-between">
                    <label className="option" style={{ border: 0, padding: 0, background: 'none', flex: 1 }}>
                      <input type="checkbox" checked={task.status === 'completed'} onChange={() => toggleDone(task)} disabled={update.isPending} />
                      <span style={task.status === 'completed' ? { textDecoration: 'line-through', color: 'var(--ink-muted)' } : undefined}>{task.title}</span>
                    </label>
                    <div className="row-actions">
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setDialog({ task })} aria-label={`Edit ${task.title}`}><Pencil size={16} aria-hidden="true" /></button>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleting(task)} aria-label={`Delete ${task.title}`}><Trash2 size={16} aria-hidden="true" /></button>
                    </div>
                  </div>
                  <div className="event-meta" style={{ marginTop: 6 }}>
                    <StatusBadge task={task} today={today} />
                    <span className={`badge ${PRIORITY_BADGE[task.priority]}`}>{PRIORITY_LABELS[task.priority]} priority</span>
                    <span className="badge badge-neutral">{TASK_CATEGORY_LABELS[task.category]}</span>
                    <span className="badge badge-neutral">Due {formatDate(task.dueDate)}</span>
                  </div>
                  {task.description && <p className="small muted" style={{ margin: '6px 0 0' }}>{task.description}</p>}
                  {task.notes && <p className="small" style={{ margin: '4px 0 0' }}>Note: {task.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <ol className="timeline">
              {visible.map((task) => (
                <li key={task.id} className={task.status === 'completed' ? 'is-done' : isOverdue(task, today) ? 'is-overdue' : undefined}>
                  <strong>{formatDate(task.dueDate)}</strong>
                  <div>{task.title} <StatusBadge task={task} today={today} /></div>
                </li>
              ))}
            </ol>
          )}
      </section>

      {dialog && <TaskDialog eventId={event.id} task={dialog.task} vendors={vendors} onClose={() => setDialog(null)} />}
      {deleting && (
        <ConfirmDialog title="Delete this task?" message={`“${deleting.title}” will be permanently removed.`} confirmLabel="Delete task" busy={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => { toast.success('Task deleted'); setDeleting(null); }, onError: (e) => { toast.error(e.message); setDeleting(null); } })}
          onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
