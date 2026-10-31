import { Plus } from 'lucide-react';
import { isOverdue, upcomingTasks, type taskProgress } from '@shared/calc/tasks';
import type { TaskRecord } from '@shared/types';
import { Notice } from '../../components/ui/Notice';
import { ProgressBar } from '../../components/ui/ProgressBar';

/** Days ahead that count as "due soon". */
const DUE_SOON_DAYS = 7;

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

interface TaskSummaryProps {
  tasks: TaskRecord[];
  progress: ReturnType<typeof taskProgress>;
  today: string;
  onAdd: () => void;
}

/** Completion card with the "Add task" button, plus warnings for overdue and soon-due tasks. */
export function TaskSummary({ tasks, progress, today, onAdd }: TaskSummaryProps) {
  const overdueCount = tasks.filter((task) => isOverdue(task, today)).length;
  const dueSoon = upcomingTasks(tasks, today, DUE_SOON_DAYS).length;

  return (
    <>
      <div className="card">
        <div className="row-between">
          <div>
            <h2 className="m-0">{progress.percent}% complete</h2>
            <p className="muted m-0">
              {progress.completed} of {progress.total} tasks done · {progress.inProgress} in progress
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <Plus size={18} aria-hidden="true" /> Add task
          </button>
        </div>
        <ProgressBar label="Task completion" value={progress.percent} />
      </div>

      {overdueCount > 0 && (
        <Notice tone="danger" live>
          <p>
            <strong>{plural(overdueCount, 'overdue task')}.</strong> Finish them or move their due dates.
          </p>
        </Notice>
      )}
      {dueSoon > 0 && (
        <Notice tone="warning">
          <p>{plural(dueSoon, 'task')} due in the next 7 days.</p>
        </Notice>
      )}
    </>
  );
}
