// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, configureApi } from './api';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

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
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers).not.toHaveProperty('Authorization');
  });

  it('turns API errors into ApiError with code and field details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(400, { error: { code: 'VALIDATION_ERROR', message: 'Some fields need attention', details: { name: ['Event name is required'] } } })));
    const error = await api.createEvent({}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', details: { name: ['Event name is required'] } });
  });

  it('signs the user out when the server says the session is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(401, { error: { code: 'UNAUTHENTICATED', message: 'Your session has expired. Please sign in again' } })));
    await expect(api.listEvents()).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('reports network failures in plain language', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(api.listEvents()).rejects.toMatchObject({ status: 0, code: 'NETWORK', message: expect.stringContaining('Could not reach the server') });
  });

  it('handles empty 204 responses and non-JSON error pages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    await expect(api.deleteTask('evt', 'id')).resolves.toBeUndefined();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(api.listEvents()).rejects.toMatchObject({ status: 502, message: 'Something went wrong. Please try again.' });
  });
});
