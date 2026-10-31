import type { Priority, TaskCategory, TaskStatus } from '../constants';
import { addDays, daysBetween } from '../dates';
import type { TaskRecord } from '../types';

export interface TaskProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  /** Whole-number completion percentage (0 when there are no tasks). */
  percent: number;
}

export interface TaskFilter {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: Priority;
}

export function taskProgress(tasks: Pick<TaskRecord, 'status'>[]): TaskProgress {
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
  return {
    total: tasks.length,
    completed,
    inProgress,
    pending: tasks.length - completed - inProgress,
    percent: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

export function isOverdue(task: Pick<TaskRecord, 'status' | 'dueDate'>, today: string): boolean {
  return task.status !== 'completed' && task.dueDate !== null && task.dueDate < today;
}

/** Soonest first; tasks without a due date go last. Ties are ordered by title. */
export function sortChronologically<T extends Pick<TaskRecord, 'dueDate' | 'title'>>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.dueDate === b.dueDate) return a.title.localeCompare(b.title);
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

/** Open tasks due from today up to `windowDays` days ahead, soonest first. */
export function upcomingTasks(tasks: TaskRecord[], today: string, windowDays = 14): TaskRecord[] {
  const last = addDays(today, windowDays);
  return sortChronologically(
    tasks.filter(
      (task) => task.status !== 'completed' && task.dueDate !== null && task.dueDate >= today && task.dueDate <= last,
    ),
  );
}

export function filterTasks(tasks: TaskRecord[], filter: TaskFilter): TaskRecord[] {
  return tasks.filter(
    (task) =>
      (!filter.status || task.status === filter.status) &&
      (!filter.category || task.category === filter.category) &&
      (!filter.priority || task.priority === filter.priority),
  );
}

/** Days until the event: negative once it has passed, null when no date is set. */
export function daysUntilEvent(eventDate: string | null, today: string): number | null {
  return eventDate === null ? null : daysBetween(today, eventDate);
}
