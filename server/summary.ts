import { daysUntilEvent } from '@shared/calc/tasks';
import type { EventRecord, EventSummary } from '@shared/types';
import type { EventStats } from './data/repository';

const EMPTY_STATS: EventStats = { taskTotal: 0, taskCompleted: 0, totalActual: 0 };

/** Dashboard-card figures, calculated from database aggregates by deterministic code. */
export function buildSummary(event: EventRecord, stats: EventStats = EMPTY_STATS, today: string): EventSummary {
  return {
    taskProgressPercent: stats.taskTotal > 0 ? Math.round((stats.taskCompleted / stats.taskTotal) * 100) : 0,
    totalActual: stats.totalActual,
    percentConsumed: event.totalBudget > 0 ? Math.round((stats.totalActual / event.totalBudget) * 1000) / 10 : 0,
    daysToEvent: daysUntilEvent(event.eventDate, today),
  };
}
