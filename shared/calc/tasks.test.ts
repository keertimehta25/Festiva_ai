import { describe, expect, it } from 'vitest';
import { makeTask } from '../test-utils';
import { daysUntilEvent, filterTasks, isOverdue, sortChronologically, taskProgress, upcomingTasks } from './tasks';

const TODAY = '2026-10-22';

describe('taskProgress', () => {
  it('counts statuses and rounds the completion percentage', () => {
    const progress = taskProgress([
      makeTask({ status: 'completed' }),
      makeTask({ status: 'in_progress' }),
      makeTask({ status: 'pending' }),
    ]);
    expect(progress).toEqual({ total: 3, completed: 1, inProgress: 1, pending: 1, percent: 33 });
  });

  it('returns 0% for an empty list and 100% when everything is done', () => {
    expect(taskProgress([]).percent).toBe(0);
    expect(taskProgress([makeTask({ status: 'completed' })]).percent).toBe(100);
  });
});

describe('isOverdue', () => {
  it('flags open tasks that are past due but not completed or undated ones', () => {
    expect(isOverdue({ status: 'pending', dueDate: '2026-10-21' }, TODAY)).toBe(true);
    expect(isOverdue({ status: 'in_progress', dueDate: '2026-10-22' }, TODAY)).toBe(false);
    expect(isOverdue({ status: 'completed', dueDate: '2026-01-01' }, TODAY)).toBe(false);
    expect(isOverdue({ status: 'pending', dueDate: null }, TODAY)).toBe(false);
  });
});

describe('ordering and filtering', () => {
  const tasks = [
    makeTask({ title: 'C', dueDate: null }),
    makeTask({ title: 'B', dueDate: '2026-11-01', priority: 'high', category: 'venue' }),
    makeTask({ title: 'A', dueDate: '2026-10-25', status: 'completed' }),
    makeTask({ title: 'D', dueDate: '2026-10-30', status: 'in_progress' }),
  ];

  it('sorts chronologically with undated tasks last', () => {
    expect(sortChronologically(tasks).map((task) => task.title)).toEqual(['A', 'D', 'B', 'C']);
  });

  it('lists only open tasks due within the window', () => {
    expect(upcomingTasks(tasks, TODAY, 9).map((task) => task.title)).toEqual(['D']);
    expect(upcomingTasks(tasks, TODAY, 10).map((task) => task.title)).toEqual(['D', 'B']);
  });

  it('filters by status, category and priority together', () => {
    expect(filterTasks(tasks, { status: 'in_progress' }).map((task) => task.title)).toEqual(['D']);
    expect(filterTasks(tasks, { category: 'venue', priority: 'high' }).map((task) => task.title)).toEqual(['B']);
    expect(filterTasks(tasks, {})).toHaveLength(4);
  });
});

describe('daysUntilEvent', () => {
  it('handles future, past and missing dates', () => {
    expect(daysUntilEvent('2026-10-29', TODAY)).toBe(7);
    expect(daysUntilEvent('2026-10-20', TODAY)).toBe(-2);
    expect(daysUntilEvent(null, TODAY)).toBeNull();
  });
});
