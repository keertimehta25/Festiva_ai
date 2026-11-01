import { z } from 'zod';
import { PRIORITIES, TASK_CATEGORIES, TASK_STATUSES } from '../constants';
import { idSchema, isoDate, partialUpdate, requiredText, text } from './fields';

const taskCore = {
  title: requiredText(140, 'Task title'),
  description: text(500),
  dueDate: isoDate.nullable(),
  priority: z.enum(PRIORITIES),
  status: z.enum(TASK_STATUSES),
  category: z.enum(TASK_CATEGORIES),
  notes: text(500),
  vendorId: idSchema.nullable(),
};

export const taskInputSchema = z.object({
  ...taskCore,
  description: taskCore.description.default(''),
  dueDate: taskCore.dueDate.default(null),
  priority: taskCore.priority.default('medium'),
  status: taskCore.status.default('pending'),
  category: taskCore.category.default('planning'),
  notes: taskCore.notes.default(''),
  vendorId: taskCore.vendorId.default(null),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

export const taskUpdateSchema = partialUpdate(taskCore);
