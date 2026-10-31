import type {
  AiChatReply,
  AiSavings,
  EventInput,
  EventUpdate,
  ExpenseInput,
  TaskInput,
  VendorInput,
} from '@shared/schemas';
import type {
  ApiErrorBody,
  EventRecord,
  EventWithSummary,
  ExpenseRecord,
  TaskRecord,
  VendorRecord,
  Workspace,
} from '@shared/types';

const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

/** An error returned by the API, with field-level details for forms. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenProvider = () => Promise<string | null>;
let getToken: TokenProvider = () => Promise.resolve(null);
let onUnauthorized: () => void = () => undefined;

/** Called once by the auth provider so API calls can attach the current session token. */
export function configureApi(options: { getToken: TokenProvider; onUnauthorized: () => void }): void {
  getToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as
    ({ data: T } & Partial<ApiErrorBody>) | ApiErrorBody | null;

  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    const error = payload && 'error' in payload && payload.error ? payload.error : null;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details,
    );
  }
  return (payload as { data: T }).data;
}

const eventPath = (eventId: string) => `/events/${eventId}`;

export const api = {
  listEvents: () => request<EventWithSummary[]>('GET', '/events'),
  getWorkspace: (eventId: string) => request<Workspace>('GET', eventPath(eventId)),
  createEvent: (input: Partial<EventInput>) =>
    request<{ event: EventRecord; tasks: TaskRecord[]; notes: string[] }>('POST', '/events', input),
  createSample: () => request<{ event: EventRecord; created: boolean }>('POST', '/events/sample'),
  updateEvent: (eventId: string, patch: EventUpdate) =>
    request<{ event: EventRecord }>('PATCH', eventPath(eventId), patch),
  deleteEvent: (eventId: string) => request<undefined>('DELETE', eventPath(eventId)),

  createTask: (eventId: string, input: Partial<TaskInput>) =>
    request<TaskRecord>('POST', `${eventPath(eventId)}/tasks`, input),
  updateTask: (eventId: string, id: string, patch: Partial<TaskInput>) =>
    request<TaskRecord>('PATCH', `${eventPath(eventId)}/tasks/${id}`, patch),
  deleteTask: (eventId: string, id: string) => request<undefined>('DELETE', `${eventPath(eventId)}/tasks/${id}`),

  createExpense: (eventId: string, input: Partial<ExpenseInput>) =>
    request<ExpenseRecord>('POST', `${eventPath(eventId)}/expenses`, input),
  updateExpense: (eventId: string, id: string, patch: Partial<ExpenseInput>) =>
    request<ExpenseRecord>('PATCH', `${eventPath(eventId)}/expenses/${id}`, patch),
  deleteExpense: (eventId: string, id: string) => request<undefined>('DELETE', `${eventPath(eventId)}/expenses/${id}`),

  createVendor: (eventId: string, input: Partial<VendorInput>) =>
    request<VendorRecord>('POST', `${eventPath(eventId)}/vendors`, input),
  updateVendor: (eventId: string, id: string, patch: Partial<VendorInput>) =>
    request<VendorRecord>('PATCH', `${eventPath(eventId)}/vendors/${id}`, patch),
  deleteVendor: (eventId: string, id: string) => request<undefined>('DELETE', `${eventPath(eventId)}/vendors/${id}`),

  generatePlan: (eventId: string) =>
    request<{ event: EventRecord; notes: string[] }>('POST', `${eventPath(eventId)}/ai/plan`),
  applyPlanTasks: (eventId: string) =>
    request<{ created: TaskRecord[]; skipped: number }>('POST', `${eventPath(eventId)}/ai/plan/apply-tasks`),
  applyPlanBudget: (eventId: string) =>
    request<{ event: EventRecord }>('POST', `${eventPath(eventId)}/ai/plan/apply-budget`),
  chat: (eventId: string, message: string, history: { role: 'user' | 'assistant'; content: string }[]) =>
    request<AiChatReply>('POST', `${eventPath(eventId)}/ai/chat`, { message, history }),
  suggestSavings: (eventId: string) => request<AiSavings>('POST', `${eventPath(eventId)}/ai/savings`),
};
