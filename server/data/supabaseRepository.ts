import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExpenseInput, TaskInput, VendorInput } from '@shared/schemas';
import type { EventRecord, ExpenseRecord, TaskRecord, VendorRecord } from '@shared/types';
import { AppError } from '../errors';
import { fromRow, toRow } from './rowMapping';
import type { ChildCollection, EventPatch, EventRepository, EventStats, NewEvent, Repository } from './repository';

type Row = Record<string, unknown>;

/** Upper bound on rows returned by any single query. */
const MAX_ROWS = 500;

function databaseError(action: string, message: string): AppError {
  // The database message is kept as the cause for the server log; clients only see a generic text.
  return new AppError(502, 'DATABASE_ERROR', `The database could not ${action}`, undefined, {
    cause: new Error(message),
  });
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, action: string): T {
  if (result.error) throw databaseError(action, result.error.message);
  if (result.data === null) throw databaseError(action, 'No data returned');
  return result.data;
}

class SupabaseEvents implements EventRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(userId: string): Promise<EventRecord[]> {
    const result = await this.db
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS);
    return unwrap<Row[]>(result, 'list events').map((row) => fromRow<EventRecord>(row));
  }

  async get(userId: string, id: string): Promise<EventRecord | null> {
    const result = await this.db.from('events').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
    if (result.error) throw databaseError('load the event', result.error.message);
    return result.data ? fromRow<EventRecord>(result.data as Row) : null;
  }

  async create(userId: string, data: NewEvent): Promise<EventRecord> {
    const result = await this.db
      .from('events')
      .insert({ ...toRow(data), user_id: userId })
      .select('*')
      .single();
    return fromRow<EventRecord>(unwrap<Row>(result, 'create the event'));
  }

  async update(userId: string, id: string, patch: EventPatch): Promise<EventRecord | null> {
    const result = await this.db
      .from('events')
      .update({ ...toRow(patch), updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (result.error) throw databaseError('update the event', result.error.message);
    return result.data ? fromRow<EventRecord>(result.data as Row) : null;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.db.from('events').delete().eq('user_id', userId).eq('id', id).select('id');
    return unwrap<Row[]>(result, 'delete the event').length > 0;
  }

  async stats(userId: string): Promise<Map<string, EventStats>> {
    const result = await this.db
      .from('event_stats')
      .select('event_id, task_total, task_completed, total_actual')
      .eq('user_id', userId)
      .limit(MAX_ROWS);
    const rows = unwrap<Row[]>(result, 'load event totals');
    return new Map(
      rows.map((row) => [
        String(row.event_id),
        {
          taskTotal: Number(row.task_total),
          taskCompleted: Number(row.task_completed),
          totalActual: Number(row.total_actual),
        },
      ]),
    );
  }
}

class SupabaseCollection<Input extends object, Record_> implements ChildCollection<Input, Record_> {
  constructor(
    private readonly db: SupabaseClient,
    private readonly table: string,
  ) {}

  async list(userId: string, eventId: string): Promise<Record_[]> {
    const result = await this.db
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(MAX_ROWS);
    return unwrap<Row[]>(result, `list ${this.table}`).map((row) => fromRow<Record_>(row));
  }

  async create(userId: string, eventId: string, input: Input): Promise<Record_> {
    const [created] = await this.createMany(userId, eventId, [input]);
    if (!created) throw databaseError(`create in ${this.table}`, 'No row returned');
    return created;
  }

  async createMany(userId: string, eventId: string, inputs: Input[]): Promise<Record_[]> {
    if (inputs.length === 0) return [];
    const rows = inputs.map((input) => ({ ...toRow(input), user_id: userId, event_id: eventId }));
    const result = await this.db.from(this.table).insert(rows).select('*');
    return unwrap<Row[]>(result, `create in ${this.table}`).map((row) => fromRow<Record_>(row));
  }

  async update(userId: string, eventId: string, id: string, patch: Partial<Input>): Promise<Record_ | null> {
    const result = await this.db
      .from(this.table)
      .update({ ...toRow(patch), updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (result.error) throw databaseError(`update in ${this.table}`, result.error.message);
    return result.data ? fromRow<Record_>(result.data as Row) : null;
  }

  async remove(userId: string, eventId: string, id: string): Promise<boolean> {
    const result = await this.db
      .from(this.table)
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('id', id)
      .select('id');
    return unwrap<Row[]>(result, `delete from ${this.table}`).length > 0;
  }
}

/** Postgres-backed repository (Supabase). Uses the server-side service-role client. */
export function createSupabaseRepository(db: SupabaseClient): Repository {
  return {
    events: new SupabaseEvents(db),
    tasks: new SupabaseCollection<TaskInput, TaskRecord>(db, 'tasks'),
    expenses: new SupabaseCollection<ExpenseInput, ExpenseRecord>(db, 'expenses'),
    vendors: new SupabaseCollection<VendorInput, VendorRecord>(db, 'vendors'),
  };
}
