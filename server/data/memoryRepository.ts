import { randomUUID } from 'node:crypto';
import type { ExpenseInput, TaskInput, VendorInput } from '@shared/schemas';
import type { EventRecord, ExpenseRecord, TaskRecord, VendorRecord } from '@shared/types';
import type { ChildCollection, EventPatch, EventRepository, EventStats, NewEvent, Repository } from './repository';

interface Owned<T> {
  userId: string;
  record: T;
}

interface ChildRecord {
  id: string;
  eventId: string;
  createdAt: string;
  updatedAt: string;
}

class MemoryCollection<Input extends object, Rec extends ChildRecord> implements ChildCollection<Input, Rec> {
  readonly rows = new Map<string, Owned<Rec>>();

  async list(userId: string, eventId: string): Promise<Rec[]> {
    return [...this.rows.values()]
      .filter((row) => row.userId === userId && row.record.eventId === eventId)
      .map((row) => row.record);
  }

  async create(userId: string, eventId: string, input: Input): Promise<Rec> {
    const now = new Date().toISOString();
    // The generic record type cannot be built from `Input` by the compiler, so the cast goes through `unknown`.
    const record = { ...input, id: randomUUID(), eventId, createdAt: now, updatedAt: now } as unknown as Rec;
    this.rows.set(record.id, { userId, record });
    return record;
  }

  async createMany(userId: string, eventId: string, inputs: Input[]): Promise<Rec[]> {
    return Promise.all(inputs.map((input) => this.create(userId, eventId, input)));
  }

  async update(userId: string, eventId: string, id: string, patch: Partial<Input>): Promise<Rec | null> {
    const row = this.find(userId, eventId, id);
    if (!row) return null;
    row.record = { ...row.record, ...patch, updatedAt: new Date().toISOString() };
    return row.record;
  }

  async remove(userId: string, eventId: string, id: string): Promise<boolean> {
    return this.find(userId, eventId, id) ? this.rows.delete(id) : false;
  }

  /** The row with this id, only when it belongs to the user and event. */
  private find(userId: string, eventId: string, id: string): Owned<Rec> | undefined {
    const row = this.rows.get(id);
    return row?.userId === userId && row.record.eventId === eventId ? row : undefined;
  }

  removeWhere(predicate: (record: Rec) => boolean): void {
    for (const [id, row] of this.rows) if (predicate(row.record)) this.rows.delete(id);
  }
}

/**
 * In-memory repository with the same ownership rules as the database one.
 * Used by automated tests; it holds no data between process runs.
 */
export function createMemoryRepository(): Repository {
  const eventRows = new Map<string, Owned<EventRecord>>();
  const tasks = new MemoryCollection<TaskInput, TaskRecord>();
  const expenses = new MemoryCollection<ExpenseInput, ExpenseRecord>();
  const vendors = new MemoryCollection<VendorInput, VendorRecord>();

  const events: EventRepository = {
    async list(userId) {
      return [...eventRows.values()].filter((row) => row.userId === userId).map((row) => row.record);
    },
    async get(userId, id) {
      const row = eventRows.get(id);
      return row?.userId === userId ? row.record : null;
    },
    async create(userId, data: NewEvent) {
      const now = new Date().toISOString();
      const record: EventRecord = {
        ...data,
        id: randomUUID(),
        plan: null,
        planGeneratedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      eventRows.set(record.id, { userId, record });
      return record;
    },
    async update(userId, id, patch: EventPatch) {
      const row = eventRows.get(id);
      if (row?.userId !== userId) return null;
      row.record = { ...row.record, ...patch, updatedAt: new Date().toISOString() };
      return row.record;
    },
    async remove(userId, id) {
      const row = eventRows.get(id);
      if (row?.userId !== userId) return false;
      eventRows.delete(id);
      for (const collection of [tasks, expenses, vendors]) collection.removeWhere((record) => record.eventId === id);
      return true;
    },
    async stats(userId) {
      const result = new Map<string, EventStats>();
      for (const { record } of [...eventRows.values()].filter((row) => row.userId === userId)) {
        const eventTasks = [...tasks.rows.values()].filter((row) => row.record.eventId === record.id);
        const eventExpenses = [...expenses.rows.values()].filter((row) => row.record.eventId === record.id);
        result.set(record.id, {
          taskTotal: eventTasks.length,
          taskCompleted: eventTasks.filter((row) => row.record.status === 'completed').length,
          totalActual: eventExpenses.reduce((sum, row) => sum + row.record.actualAmount, 0),
        });
      }
      return result;
    },
  };

  const removeVendor = vendors.remove.bind(vendors);
  vendors.remove = async (userId, eventId, id) => {
    const removed = await removeVendor(userId, eventId, id);
    if (removed) {
      // Mirrors the database's "on delete set null" for linked tasks and expenses.
      for (const row of tasks.rows.values())
        if (row.record.vendorId === id) row.record = { ...row.record, vendorId: null };
      for (const row of expenses.rows.values())
        if (row.record.vendorId === id) row.record = { ...row.record, vendorId: null };
    }
    return removed;
  };

  return { events, tasks, expenses, vendors };
}
