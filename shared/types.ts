import type { Allocations, AiPlan, EventInput, ExpenseInput, TaskInput, VendorInput } from './schemas';

interface Stamped {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** An AI plan as stored: the validated model output plus values computed by the server. */
export interface StoredPlan extends AiPlan {
  /** Name of the model that produced the plan (from configuration). */
  model: string;
  /** Rupee amounts derived from the model's percentages by deterministic code. */
  allocationAmounts: Allocations;
  /** Sum of the model's itemised estimates, computed by the server. */
  estimatedTotal: number;
  /** Set when the itemised estimates do not fit the budget. */
  budgetWarning: string | null;
}

export interface EventRecord extends EventInput, Stamped {
  allocations: Allocations;
  plan: StoredPlan | null;
  planGeneratedAt: string | null;
  isSample: boolean;
}

export interface TaskRecord extends TaskInput, Stamped {
  eventId: string;
}

export interface ExpenseRecord extends ExpenseInput, Stamped {
  eventId: string;
}

export interface VendorRecord extends VendorInput, Stamped {
  eventId: string;
}

/** Everything the workspace screens need, fetched in a single request. */
export interface Workspace {
  event: EventRecord;
  tasks: TaskRecord[];
  expenses: ExpenseRecord[];
  vendors: VendorRecord[];
}

/** Compact, server-computed figures shown on dashboard cards. */
export interface EventSummary {
  taskProgressPercent: number;
  totalActual: number;
  percentConsumed: number;
  daysToEvent: number | null;
}

export interface EventWithSummary {
  event: EventRecord;
  summary: EventSummary;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string[]> };
}
