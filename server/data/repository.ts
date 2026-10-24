import type { EventInput, ExpenseInput, TaskInput, VendorInput } from '@shared/schemas';
import type { EventRecord, ExpenseRecord, TaskRecord, VendorRecord } from '@shared/types';

/** Fields written when an event is created. */
export type NewEvent = EventInput & Pick<EventRecord, 'allocations' | 'isSample'>;

/** Fields that may change after creation. */
export type EventPatch = Partial<Omit<EventRecord, 'id' | 'createdAt' | 'updatedAt'>>;

/** Aggregates used for dashboard cards, computed in the database where possible. */
export interface EventStats {
  taskTotal: number;
  taskCompleted: number;
  totalActual: number;
}

/**
 * Every method takes the authenticated user's id and filters by it, so a record can
 * never be read or changed through another user's session, whatever id is supplied.
 */
export interface EventRepository {
  list(userId: string): Promise<EventRecord[]>;
  get(userId: string, id: string): Promise<EventRecord | null>;
  create(userId: string, data: NewEvent): Promise<EventRecord>;
  update(userId: string, id: string, patch: EventPatch): Promise<EventRecord | null>;
  remove(userId: string, id: string): Promise<boolean>;
  /** Task and spending totals per event id. */
  stats(userId: string): Promise<Map<string, EventStats>>;
}

/** Records that belong to one event (tasks, expenses, vendors). */
export interface ChildCollection<Input, Record> {
  list(userId: string, eventId: string): Promise<Record[]>;
  create(userId: string, eventId: string, input: Input): Promise<Record>;
  createMany(userId: string, eventId: string, inputs: Input[]): Promise<Record[]>;
  update(userId: string, eventId: string, id: string, patch: Partial<Input>): Promise<Record | null>;
  remove(userId: string, eventId: string, id: string): Promise<boolean>;
}

export interface Repository {
  events: EventRepository;
  tasks: ChildCollection<TaskInput, TaskRecord>;
  expenses: ChildCollection<ExpenseInput, ExpenseRecord>;
  vendors: ChildCollection<VendorInput, VendorRecord>;
}
