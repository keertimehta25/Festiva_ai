import type { EventType } from './constants';
import { addDays, daysBetween } from './dates';
import type { TaskInput } from './schemas';
import { ANNIVERSARY_TASKS, BIRTHDAY_TASKS } from './templates/familyEvents';
import { COLLEGE_TASKS, COMMUNITY_TASKS, CUSTOM_TASKS } from './templates/groupEvents';
import type { TemplateTask } from './templates/template';
import { WEDDING_TASKS } from './templates/wedding';

const TEMPLATES: Record<EventType, TemplateTask[]> = {
  wedding: WEDDING_TASKS,
  birthday: BIRTHDAY_TASKS,
  anniversary: ANNIVERSARY_TASKS,
  community: COMMUNITY_TASKS,
  college: COLLEGE_TASKS,
  custom: CUSTOM_TASKS,
};

/**
 * Builds a starter task list from the event type and date.
 * - Lead times are longer for weddings than for birthdays.
 * - If the event is closer than the ideal lead time, due dates are compressed proportionally
 *   and never fall before today.
 * - Without a date (or for a date in the past) tasks are created without due dates.
 */
export function generateBaseTasks(eventType: EventType, eventDate: string | null, today: string): TaskInput[] {
  const template = TEMPLATES[eventType];
  const daysAvailable = eventDate === null ? null : daysBetween(today, eventDate);
  const longestLead = Math.max(...template.map((task) => task.leadDays));
  const scale = daysAvailable === null ? 1 : Math.min(1, Math.max(daysAvailable, 0) / longestLead);

  return template.map((task) => {
    let dueDate: string | null = null;
    if (eventDate !== null && daysAvailable !== null && daysAvailable >= 0) {
      const due = addDays(eventDate, -Math.round(task.leadDays * scale));
      dueDate = due < today ? today : due;
    }
    return {
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      status: 'pending',
      dueDate,
      notes: '',
      vendorId: null,
    };
  });
}

/** Converts a "days before the event" offset (as returned by the AI plan) into a due date. */
export function dueDateFromLead(eventDate: string | null, daysBeforeEvent: number, today: string): string | null {
  if (eventDate === null || eventDate < today) return null;
  const due = addDays(eventDate, -daysBeforeEvent);
  return due < today ? today : due;
}
