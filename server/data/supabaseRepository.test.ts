import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { AppError } from '../errors';
import { createSupabaseRepository } from './supabaseRepository';

type Call = [method: string, args: unknown[]];
interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

/**
 * A stand-in for the Supabase query builder: every chained call is recorded, and awaiting the chain
 * returns the prepared result. This checks what the repository asks the database for, not Postgres itself.
 */
function fakeDb(result: QueryResult) {
  const calls: Call[] = [];
  const chain: unknown = new Proxy(
    {},
    {
      get(_target, property: string) {
        if (property === 'then') return (resolve: (value: QueryResult) => void) => resolve(result);
        return (...args: unknown[]) => {
          calls.push([property, args]);
          return chain;
        };
      },
    },
  );
  const db = {
    from(table: string) {
      calls.push(['from', [table]]);
      return chain;
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

const ok = (data: unknown): QueryResult => ({ data, error: null });
const failure = (message: string): QueryResult => ({ data: null, error: { message } });
const filters = (calls: Call[]) => calls.filter(([method]) => method === 'eq').map(([, args]) => args);

describe('event repository', () => {
  it('lists only the user’s events, converting columns to camelCase and hiding user_id', async () => {
    const { db, calls } = fakeDb(ok([{ id: 'e1', user_id: 'u1', total_budget: 5000, is_sample: false }]));
    const events = await createSupabaseRepository(db).events.list('u1');

    expect(events).toEqual([{ id: 'e1', totalBudget: 5000, isSample: false }]);
    expect(filters(calls)).toContainEqual(['user_id', 'u1']);
  });

  it('gets one event scoped to the user, or null when it is missing', async () => {
    const found = fakeDb(ok({ id: 'e1', user_id: 'u1', guest_count: 10 }));
    await expect(createSupabaseRepository(found.db).events.get('u1', 'e1')).resolves.toEqual({
      id: 'e1',
      guestCount: 10,
    });
    expect(filters(found.calls)).toEqual(
      expect.arrayContaining([
        ['user_id', 'u1'],
        ['id', 'e1'],
      ]),
    );

    const missing = fakeDb(ok(null));
    await expect(createSupabaseRepository(missing.db).events.get('u1', 'nope')).resolves.toBeNull();
  });

  it('writes the owner’s id when creating an event', async () => {
    const { db, calls } = fakeDb(ok({ id: 'e1', user_id: 'u1', name: 'Party' }));
    const created = await createSupabaseRepository(db).events.create('u1', { name: 'Party' } as never);

    expect(created).toEqual({ id: 'e1', name: 'Party' });
    const insert = calls.find(([method]) => method === 'insert');
    expect(insert?.[1][0]).toMatchObject({ user_id: 'u1', name: 'Party' });
  });

  it('updates within the user’s own rows and stamps updated_at', async () => {
    const { db, calls } = fakeDb(ok({ id: 'e1', user_id: 'u1', name: 'New' }));
    await expect(createSupabaseRepository(db).events.update('u1', 'e1', { name: 'New' })).resolves.toEqual({
      id: 'e1',
      name: 'New',
    });
    const update = calls.find(([method]) => method === 'update');
    expect(update?.[1][0]).toMatchObject({ name: 'New', updated_at: expect.any(String) });
    expect(filters(calls)).toContainEqual(['user_id', 'u1']);
  });

  it('returns null when updating an event that is not the user’s', async () => {
    const { db } = fakeDb(ok(null));
    await expect(createSupabaseRepository(db).events.update('u1', 'e9', { name: 'x' })).resolves.toBeNull();
  });

  it('reports whether a delete removed anything', async () => {
    await expect(createSupabaseRepository(fakeDb(ok([{ id: 'e1' }])).db).events.remove('u1', 'e1')).resolves.toBe(true);
    await expect(createSupabaseRepository(fakeDb(ok([])).db).events.remove('u1', 'e1')).resolves.toBe(false);
  });

  it('turns the stats view into a map of numbers per event', async () => {
    const { db } = fakeDb(ok([{ event_id: 'e1', task_total: '4', task_completed: 1, total_actual: '2500' }]));
    const stats = await createSupabaseRepository(db).events.stats('u1');

    expect(stats.get('e1')).toEqual({ taskTotal: 4, taskCompleted: 1, totalActual: 2500 });
  });
});

describe('child collections (tasks, expenses, vendors)', () => {
  it('lists rows for one event, scoped to the user', async () => {
    const { db, calls } = fakeDb(ok([{ id: 't1', user_id: 'u1', event_id: 'e1', due_date: null }]));
    const tasks = await createSupabaseRepository(db).tasks.list('u1', 'e1');

    expect(tasks).toEqual([{ id: 't1', eventId: 'e1', dueDate: null }]);
    expect(calls[0]).toEqual(['from', ['tasks']]);
    expect(filters(calls)).toEqual(
      expect.arrayContaining([
        ['user_id', 'u1'],
        ['event_id', 'e1'],
      ]),
    );
  });

  it('creates a row with the owner and event ids attached', async () => {
    const { db, calls } = fakeDb(ok([{ id: 'v1', user_id: 'u1', event_id: 'e1', quoted_price: 100 }]));
    const vendor = await createSupabaseRepository(db).vendors.create('u1', 'e1', { quotedPrice: 100 } as never);

    expect(vendor).toEqual({ id: 'v1', eventId: 'e1', quotedPrice: 100 });
    expect(calls.find(([method]) => method === 'insert')?.[1][0]).toEqual([
      { quoted_price: 100, user_id: 'u1', event_id: 'e1' },
    ]);
  });

  it('does not call the database when there is nothing to create', async () => {
    const { db, calls } = fakeDb(ok([]));
    await expect(createSupabaseRepository(db).expenses.createMany('u1', 'e1', [])).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('fails clearly when an insert returns no row', async () => {
    const { db } = fakeDb(ok([]));
    await expect(createSupabaseRepository(db).tasks.create('u1', 'e1', { title: 'x' } as never)).rejects.toMatchObject({
      code: 'DATABASE_ERROR',
    });
  });

  it('updates one row within the event, or returns null when it is not found', async () => {
    const hit = fakeDb(ok({ id: 't1', user_id: 'u1', event_id: 'e1', title: 'New' }));
    await expect(createSupabaseRepository(hit.db).tasks.update('u1', 'e1', 't1', { title: 'New' })).resolves.toEqual({
      id: 't1',
      eventId: 'e1',
      title: 'New',
    });
    expect(filters(hit.calls)).toEqual(
      expect.arrayContaining([
        ['user_id', 'u1'],
        ['event_id', 'e1'],
        ['id', 't1'],
      ]),
    );

    const miss = fakeDb(ok(null));
    await expect(createSupabaseRepository(miss.db).tasks.update('u1', 'e1', 't9', { title: 'x' })).resolves.toBeNull();
  });

  it('reports whether a delete removed a row', async () => {
    await expect(createSupabaseRepository(fakeDb(ok([{ id: 't1' }])).db).tasks.remove('u1', 'e1', 't1')).resolves.toBe(
      true,
    );
    await expect(createSupabaseRepository(fakeDb(ok([])).db).tasks.remove('u1', 'e1', 't1')).resolves.toBe(false);
  });
});

describe('database failures', () => {
  it('hide the database message from callers but keep it as the cause for the log', async () => {
    const { db } = fakeDb(failure('relation "events" does not exist'));
    const error = await createSupabaseRepository(db)
      .events.list('u1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 502, code: 'DATABASE_ERROR', message: 'The database could not list events' });
    expect((error as AppError).message).not.toContain('relation');
    expect((error as AppError).cause).toBeInstanceOf(Error);
  });

  it('are raised for single-row reads and updates too', async () => {
    const repo = createSupabaseRepository(fakeDb(failure('boom')).db);
    await expect(repo.events.get('u1', 'e1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    await expect(repo.events.update('u1', 'e1', { name: 'x' })).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
    await expect(repo.vendors.update('u1', 'e1', 'v1', { name: 'x' })).rejects.toMatchObject({
      code: 'DATABASE_ERROR',
    });
  });

  it('treat a missing result as an error when data was required', async () => {
    const repo = createSupabaseRepository(fakeDb({ data: null, error: null }).db);
    await expect(repo.events.list('u1')).rejects.toMatchObject({ code: 'DATABASE_ERROR' });
  });
});
