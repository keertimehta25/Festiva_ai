import { isOverdue } from '@shared/calc/tasks';
import type { TaskRecord } from '@shared/types';
import { formatDate } from '../../lib/format';
import { StatusBadge } from './StatusBadge';

function timelineClass(task: TaskRecord, today: string): string | undefined {
  if (task.status === 'completed') return 'is-done';
  return isOverdue(task, today) ? 'is-overdue' : undefined;
}

/** Tasks in date order as a vertical timeline. */
export function TaskTimeline({ tasks, today }: { tasks: TaskRecord[]; today: string }) {
  return (
    <ol className="timeline">
      {tasks.map((task) => (
        <li key={task.id} className={timelineClass(task, today)}>
          <strong>{formatDate(task.dueDate)}</strong>
          <div>
            {task.title} <StatusBadge task={task} today={today} />
          </div>
        </li>
      ))}
    </ol>
  );
}
