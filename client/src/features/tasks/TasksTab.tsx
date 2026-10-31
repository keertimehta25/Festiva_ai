import { useState } from 'react';
import { filterTasks, sortChronologically, taskProgress, type TaskFilter } from '@shared/calc/tasks';
import type { TaskRecord, Workspace } from '@shared/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toasts';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { getToday } from '../../hooks/useToday';
import { api } from '../../lib/api';
import { TaskDialog } from './TaskDialog';
import { TaskList } from './TaskList';
import { TaskSummary } from './TaskSummary';
import { TaskTimeline } from './TaskTimeline';
import { TaskToolbar, type TaskView } from './TaskToolbar';

export default function TasksTab({ workspace }: { workspace: Workspace }) {
  const { event, tasks, vendors } = workspace;
  const today = getToday();
  const toast = useToast();
  const [filter, setFilter] = useState<TaskFilter>({});
  const [view, setView] = useState<TaskView>('list');
  // `null` means closed; `{ task: null }` means "add a new task".
  const [dialog, setDialog] = useState<{ task: TaskRecord | null } | null>(null);
  const [deleting, setDeleting] = useState<TaskRecord | null>(null);

  const visible = sortChronologically(filterTasks(tasks, filter));
  const update = useWorkspaceMutation(event.id, ({ id, status }: { id: string; status: TaskRecord['status'] }) =>
    api.updateTask(event.id, id, { status }),
  );
  const remove = useWorkspaceMutation(event.id, (id: string) => api.deleteTask(event.id, id));

  const toggleDone = (task: TaskRecord) => {
    update.mutate(
      { id: task.id, status: task.status === 'completed' ? 'pending' : 'completed' },
      { onError: (error) => toast.error(error.message) },
    );
  };
  const confirmDelete = (task: TaskRecord) => {
    remove.mutate(task.id, {
      onSuccess: () => {
        toast.success('Task deleted');
        setDeleting(null);
      },
      onError: (error) => {
        toast.error(error.message);
        setDeleting(null);
      },
    });
  };

  return (
    <div className="stack">
      <TaskSummary
        tasks={tasks}
        progress={taskProgress(tasks)}
        today={today}
        onAdd={() => {
          setDialog({ task: null });
        }}
      />

      <section className="card" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="visually-hidden">
          Task list
        </h2>
        <TaskToolbar filter={filter} onFilterChange={setFilter} view={view} onViewChange={setView} />
        <p className="muted small" role="status">
          Showing {visible.length} of {tasks.length} tasks
        </p>

        {tasks.length === 0 ? (
          <EmptyState title="No tasks yet">Add your first task, or generate a timeline from the AI plan.</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState title="No tasks match these filters">Clear a filter to see more.</EmptyState>
        ) : view === 'list' ? (
          <TaskList
            tasks={visible}
            today={today}
            busy={update.isPending}
            onToggleDone={toggleDone}
            onEdit={(task) => {
              setDialog({ task });
            }}
            onDelete={setDeleting}
          />
        ) : (
          <TaskTimeline tasks={visible} today={today} />
        )}
      </section>

      {dialog && (
        <TaskDialog
          eventId={event.id}
          task={dialog.task}
          vendors={vendors}
          onClose={() => {
            setDialog(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this task?"
          message={`“${deleting.title}” will be permanently removed.`}
          confirmLabel="Delete task"
          busy={remove.isPending}
          onConfirm={() => {
            confirmDelete(deleting);
          }}
          onCancel={() => {
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
