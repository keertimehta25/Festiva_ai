// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, configureApi } from './api';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('api client', () => {
  const onUnauthorized = vi.fn();
  beforeEach(() => configureApi({ getToken: async () => 'tok-123', onUnauthorized }));
  afterEach(() => vi.unstubAllGlobals());

  it('sends the session token and JSON body, and unwraps the data envelope', async () => {
    const fetchMock = vi.fn(async () => json(201, { data: { id: 'x' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.createTask('evt', { title: 'Book venue' })).resolves.toEqual({ id: 'x' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/events/evt/tasks');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
    expect(init.body).toBe('{"title":"Book venue"}');
  });

  it('omits the Authorization header when signed out', async () => {
    configureApi({ getToken: async () => null, onUnauthorized });
    const fetchMock = vi.fn(async () => json(200, { data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await api.listEvents();
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers).not.toHaveProperty(
      'Authorization',
    );
  });

  it('turns API errors into ApiError with code and field details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some fields need attention',
            details: { name: ['Event name is required'] },
          },
        }),
      ),
    );
    const error = await api.createEvent({}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: { name: ['Event name is required'] },
    });
  });

  it('signs the user out when the server says the session is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(401, { error: { code: 'UNAUTHENTICATED', message: 'Your session has expired. Please sign in again' } }),
      ),
    );
    await expect(api.listEvents()).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('reports network failures in plain language', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(api.listEvents()).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK',
      message: expect.stringContaining('Could not reach the server'),
    });
  });

  it('handles empty 204 responses and non-JSON error pages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    await expect(api.deleteTask('evt', 'id')).resolves.toBeUndefined();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })),
    );
    await expect(api.listEvents()).rejects.toMatchObject({
      status: 502,
      message: 'Something went wrong. Please try again.',
    });
  });
});

describe('api endpoints', () => {
  afterEach(() => vi.unstubAllGlobals());

  // Each call must hit the documented method and path, so a typo in a route cannot slip through.
  const endpoints: [name: string, call: () => Promise<unknown>, method: string, path: string][] = [
    ['listEvents', () => api.listEvents(), 'GET', '/api/events'],
    ['getWorkspace', () => api.getWorkspace('e1'), 'GET', '/api/events/e1'],
    ['createEvent', () => api.createEvent({ name: 'x' }), 'POST', '/api/events'],
    ['createSample', () => api.createSample(), 'POST', '/api/events/sample'],
    ['updateEvent', () => api.updateEvent('e1', { name: 'x' }), 'PATCH', '/api/events/e1'],
    ['deleteEvent', () => api.deleteEvent('e1'), 'DELETE', '/api/events/e1'],
    ['createTask', () => api.createTask('e1', { title: 'x' }), 'POST', '/api/events/e1/tasks'],
    ['updateTask', () => api.updateTask('e1', 't1', { title: 'x' }), 'PATCH', '/api/events/e1/tasks/t1'],
    ['deleteTask', () => api.deleteTask('e1', 't1'), 'DELETE', '/api/events/e1/tasks/t1'],
    ['createExpense', () => api.createExpense('e1', { title: 'x' }), 'POST', '/api/events/e1/expenses'],
    ['updateExpense', () => api.updateExpense('e1', 'x1', { title: 'x' }), 'PATCH', '/api/events/e1/expenses/x1'],
    ['deleteExpense', () => api.deleteExpense('e1', 'x1'), 'DELETE', '/api/events/e1/expenses/x1'],
    ['createVendor', () => api.createVendor('e1', { name: 'x' }), 'POST', '/api/events/e1/vendors'],
    ['updateVendor', () => api.updateVendor('e1', 'v1', { name: 'x' }), 'PATCH', '/api/events/e1/vendors/v1'],
    ['deleteVendor', () => api.deleteVendor('e1', 'v1'), 'DELETE', '/api/events/e1/vendors/v1'],
    ['generatePlan', () => api.generatePlan('e1'), 'POST', '/api/events/e1/ai/plan'],
    ['applyPlanTasks', () => api.applyPlanTasks('e1'), 'POST', '/api/events/e1/ai/plan/apply-tasks'],
    ['applyPlanBudget', () => api.applyPlanBudget('e1'), 'POST', '/api/events/e1/ai/plan/apply-budget'],
    ['chat', () => api.chat('e1', 'hi', []), 'POST', '/api/events/e1/ai/chat'],
    ['suggestSavings', () => api.suggestSavings('e1'), 'POST', '/api/events/e1/ai/savings'],
  ];

  it.each(endpoints)('%s uses %s %s', async (_name, call, method, path) => {
    configureApi({ getToken: async () => null, onUnauthorized: vi.fn() });
    const fetchMock = vi.fn(async () =>
      method === 'DELETE' ? new Response(null, { status: 204 }) : json(200, { data: {} }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await call();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(path);
    expect(init.method).toBe(method);
  });
});
