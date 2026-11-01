import type { Priority, TaskCategory } from '../constants';

export interface TemplateTask {
  title: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  /** How many days before the event this task should ideally be finished. */
  leadDays: number;
}

export const t = (
  title: string,
  category: TaskCategory,
  priority: Priority,
  leadDays: number,
  description: string,
): TemplateTask => ({
  title,
  description,
  category,
  priority,
  leadDays,
});
