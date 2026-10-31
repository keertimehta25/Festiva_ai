// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, todayInZone } from '@shared/dates';
import { makeAllocations, makeEvent, makeExpense, makeTask, makeVendor } from '@shared/test-utils';
import type { ExpenseRecord, TaskRecord, Workspace } from '@shared/types';
import { checkA11y } from '../test/a11y';
import { renderWithProviders } from '../test/render';
import WorkspacePage from './WorkspacePage';

// A tiny in-memory stand-in for the server: mutations change `store`, and getWorkspace reads it back.
const store = vi.hoisted(() => ({
  ws: null as unknown as Workspace,
  chatReply: { reply: '', proposals: [] as unknown[] },
}));

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return {
    ...actual,
    api: {
      getWorkspace: vi.fn(async () => structuredClone(store.ws)),
      listEvents: vi.fn(async () => []),
      createExpense: vi.fn(async (_eventId: string, input: Record<string, unknown>) => {
        const record = {
          ...input,
          id: crypto.randomUUID(),
          eventId: store.ws.event.id,
          createdAt: '',
          updatedAt: '',
        } as unknown as ExpenseRecord;
        store.ws.expenses.push(record);
        return record;
      }),
      deleteExpense: vi.fn(async (_eventId: string, id: string) => {
        store.ws.expenses = store.ws.expenses.filter((e) => e.id !== id);
      }),
      updateTask: vi.fn(async (_eventId: string, id: string, patch: Partial<TaskRecord>) => {
        store.ws.tasks = store.ws.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
        return store.ws.tasks.find((t) => t.id === id);
      }),
      createTask: vi.fn(async (_eventId: string, input: Record<string, unknown>) => {
        const record = {
          ...input,
          id: crypto.randomUUID(),
          eventId: store.ws.event.id,
          status: 'pending',
          notes: '',
          vendorId: null,
          createdAt: '',
          updatedAt: '',
        } as unknown as TaskRecord;
        store.ws.tasks.push(record);
        return record;
      }),
      updateEvent: vi.fn(async (_eventId: string, patch: Record<string, unknown>) => {
        store.ws.event = { ...store.ws.event, ...patch };
        return { event: store.ws.event };
      }),
      chat: vi.fn(async () => store.chatReply),
    },
  };
});

const { api } = await import('../lib/api');
const TODAY = todayInZone();

function seed(overrides: Partial<Workspace> = {}) {
  const event = makeEvent({
    totalBudget: 800_000,
    allocations: makeAllocations({ venue: 200_000, catering: 300_000, decoration: 100_000, miscellaneous: 200_000 }),
    eventDate: addDays(TODAY, 90),
  });
  store.ws = { event, tasks: [], expenses: [], vendors: [], ...overrides };
  store.chatReply = { reply: '', proposals: [] };
}

/** The card for a stat tile, found by its label (labels also appear in table headings). */
function stat(label: string): HTMLElement {
  const card = screen.getByText(label, { selector: '.stat-label' }).parentElement;
  if (!card) throw new Error(`Stat tile "${label}" has no card`);
  return card;
}

function open(tab: string) {
  return renderWithProviders(
    <Routes>
      <Route path="events/:eventId/*" element={<WorkspacePage />} />
    </Routes>,
    `/events/${store.ws.event.id}/${tab}`,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  seed();
});

describe('Budget tab', () => {
  it('adds an expense and the remaining balance and percentage update', async () => {
    const user = userEvent.setup();
    open('budget');
    expect(await screen.findByText('Spent so far')).toBeInTheDocument();
    expect(stat('Spent so far')).toHaveTextContent('₹0');
    expect(stat('Remaining')).toHaveTextContent('₹8,00,000');

    await user.click(screen.getByRole('button', { name: /Add expense/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Add expense' });
    await user.type(within(dialog).getByLabelText('What is it for?'), 'Venue advance');
    await user.selectOptions(within(dialog).getByLabelText('Category'), 'venue');
    await user.type(within(dialog).getByLabelText(/Actual amount paid/), '1,25,000');
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));

    await waitFor(() => expect(stat('Remaining')).toHaveTextContent('₹6,75,000'));
    expect(stat('Spent so far')).toHaveTextContent('15.6% of budget');
    expect(screen.getAllByText('Venue advance').length).toBeGreaterThan(0);
    expect(api.createExpense).toHaveBeenCalledWith(
      store.ws.event.id,
      expect.objectContaining({ title: 'Venue advance', category: 'venue', actualAmount: 125_000, estimatedAmount: 0 }),
    );
  });

  it.each([['-500'], ['12.5'], ['abc']])('rejects the invalid amount "%s" without calling the API', async (amount) => {
    const user = userEvent.setup();
    open('budget');
    await user.click(await screen.findByRole('button', { name: /Add expense/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('What is it for?'), 'Decor');
    await user.type(within(dialog).getByLabelText(/Actual amount paid/), amount);
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));
    expect(await within(dialog).findByText('Enter a valid amount')).toBeInTheDocument();
    expect(api.createExpense).not.toHaveBeenCalled();
  });

  it('requires an amount', async () => {
    const user = userEvent.setup();
    open('budget');
    await user.click(await screen.findByRole('button', { name: /Add expense/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('What is it for?'), 'Decor');
    await user.click(within(dialog).getByRole('button', { name: 'Add expense' }));
    expect(await within(dialog).findByText('Enter an estimated or an actual amount')).toBeInTheDocument();
  });

  it('warns about overspending with text, not colour alone, and offers a reallocation', async () => {
    seed({
      expenses: [
        makeExpense({ title: 'Flowers', category: 'decoration', actualAmount: 130_000 }),
        makeExpense({ title: 'Hall', category: 'venue', actualAmount: 50_000, estimatedAmount: 60_000 }),
      ],
    });
    const user = userEvent.setup();
    open('budget');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Decoration: over by ₹30,000');
    expect(screen.getByText('Over budget', { selector: '.badge' })).toBeInTheDocument();

    const suggestion = screen.getByText(/Move ₹30,000 from .* to Decoration/);
    await user.click(within(suggestion.closest('li') as HTMLElement).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(api.updateEvent).toHaveBeenCalled());
    const allocations = (vi.mocked(api.updateEvent).mock.calls[0]?.[1] as { allocations: Record<string, number> })
      .allocations;
    expect(allocations.decoration).toBe(130_000);
    expect(Object.values(allocations).reduce((a, b) => a + b, 0)).toBe(800_000);
  });

  it('asks for confirmation before deleting an expense, and Cancel keeps it', async () => {
    seed({ expenses: [makeExpense({ title: 'Flowers', category: 'decoration', actualAmount: 10_000 })] });
    const user = userEvent.setup();
    open('budget');
    await user.click(await screen.findByRole('button', { name: 'Delete Flowers' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this expense?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(api.deleteExpense).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete Flowers' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete expense' }));
    await waitFor(() => expect(api.deleteExpense).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Flowers')).not.toBeInTheDocument());
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    seed({ expenses: [makeExpense({ title: 'Flowers', category: 'decoration', actualAmount: 130_000 })] });
    const { container } = open('budget');
    await screen.findByText('Budget by category');
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});

describe('Tasks tab', () => {
  const tasks = () => [
    makeTask({
      title: 'Book venue',
      status: 'completed',
      dueDate: addDays(TODAY, -10),
      category: 'venue',
      priority: 'high',
    }),
    makeTask({ title: 'Order invitations', status: 'pending', dueDate: addDays(TODAY, -2), category: 'invitations' }),
    makeTask({ title: 'Taste menu', status: 'in_progress', dueDate: addDays(TODAY, 3), category: 'catering' }),
    makeTask({
      title: 'Book DJ',
      status: 'pending',
      dueDate: addDays(TODAY, 30),
      category: 'entertainment',
      priority: 'low',
    }),
  ];

  it('shows progress, flags overdue tasks and completes a task, updating the percentage', async () => {
    seed({ tasks: tasks() });
    const user = userEvent.setup();
    open('tasks');
    expect(await screen.findByText('25% complete')).toBeInTheDocument();
    expect(screen.getByText(/1 overdue task\./)).toBeInTheDocument();
    expect(screen.getByText('Overdue', { selector: '.badge' })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Taste menu' }));
    await waitFor(() => expect(screen.getByText('50% complete')).toBeInTheDocument());
    expect(api.updateTask).toHaveBeenCalledWith(store.ws.event.id, expect.any(String), { status: 'completed' });
  });

  it('filters by status and priority and reports the count', async () => {
    seed({ tasks: tasks() });
    const user = userEvent.setup();
    open('tasks');
    await screen.findByText('Showing 4 of 4 tasks');

    await user.selectOptions(screen.getByLabelText('Status'), 'pending');
    expect(screen.getByText('Showing 2 of 4 tasks')).toBeInTheDocument();
    expect(screen.queryByText('Book venue')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Priority'), 'low');
    expect(screen.getByText('Showing 1 of 4 tasks')).toBeInTheDocument();
    expect(screen.getByText('Book DJ')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Category'), 'venue');
    expect(screen.getByText('No tasks match these filters')).toBeInTheDocument();
  });

  it('adds a task with validation', async () => {
    seed({ tasks: [] });
    const user = userEvent.setup();
    open('tasks');
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add task/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Add task' });
    await user.click(within(dialog).getByRole('button', { name: 'Add task' }));
    expect(await within(dialog).findByText('Task title is required')).toBeInTheDocument();
    expect(api.createTask).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Task'), 'Call photographer');
    await user.click(within(dialog).getByRole('button', { name: 'Add task' }));
    await waitFor(() =>
      expect(api.createTask).toHaveBeenCalledWith(
        store.ws.event.id,
        expect.objectContaining({ title: 'Call photographer', status: 'pending' }),
      ),
    );
    expect(await screen.findByText('Call photographer')).toBeInTheDocument();
  });

  it('switches to a chronological timeline view', async () => {
    seed({ tasks: tasks() });
    const user = userEvent.setup();
    open('tasks');
    await user.click(await screen.findByRole('button', { name: 'Timeline' }));
    const items = screen.getAllByRole('listitem').filter((li) => li.closest('ol.timeline'));
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Book venue'),
      expect.stringContaining('Order invitations'),
      expect.stringContaining('Taste menu'),
      expect.stringContaining('Book DJ'),
    ]);
  });
});

describe('Vendors tab', () => {
  it('shows vendor totals and pending payments and states that vendors are user-entered', async () => {
    seed({
      vendors: [
        makeVendor({
          name: 'Hall A',
          category: 'venue',
          bookingStatus: 'booked',
          quotedPrice: 200_000,
          advanceAmount: 50_000,
          paymentStatus: 'advance_paid',
        }),
        makeVendor({ name: 'Caterer B', bookingStatus: 'quoted', quotedPrice: 90_000 }),
        makeVendor({ name: 'Rejected C', bookingStatus: 'rejected', quotedPrice: 500_000 }),
      ],
    });
    open('vendors');
    expect(await screen.findByText(/does not look up, verify or rate vendors/)).toBeInTheDocument();
    expect(stat('Quoted (active vendors)')).toHaveTextContent('₹2,90,000');
    expect(stat('Committed (booked)')).toHaveTextContent('₹2,00,000');
    expect(stat('Pending payments')).toHaveTextContent('₹1,50,000');
    expect(screen.getByText('Booked', { selector: '.badge' })).toBeInTheDocument();
  });

  it('flags vendor follow-ups that are due', async () => {
    seed({ vendors: [makeVendor({ name: 'Hall A', bookingStatus: 'contacted', followUpDate: addDays(TODAY, -1) })] });
    open('vendors');
    expect((await screen.findByText(/Follow-ups due:/)).closest('p')).toHaveTextContent('Hall A');
  });
});

describe('Copilot tab', () => {
  it('sends the question, shows the answer, and applies a proposal only after confirmation', async () => {
    store.chatReply = {
      reply: 'Book the DJ this week.',
      proposals: [
        {
          type: 'add_task',
          summary: 'Add a DJ booking task',
          task: {
            title: 'Book DJ',
            description: 'Confirm playlist',
            category: 'entertainment',
            priority: 'high',
            dueDate: addDays(TODAY, 7),
          },
        },
      ],
    };
    const user = userEvent.setup();
    open('copilot');
    await user.click(await screen.findByRole('button', { name: 'What tasks am I likely to have forgotten?' }));

    expect(await screen.findByText('Book the DJ this week.')).toBeInTheDocument();
    expect(vi.mocked(api.chat)).toHaveBeenCalledWith(
      store.ws.event.id,
      'What tasks am I likely to have forgotten?',
      [],
    );
    expect(screen.getByText('Suggested change: not applied yet')).toBeInTheDocument();
    expect(api.createTask).not.toHaveBeenCalled();
    expect(store.ws.tasks).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Apply this change' }));
    await waitFor(() =>
      expect(api.createTask).toHaveBeenCalledWith(
        store.ws.event.id,
        expect.objectContaining({ title: 'Book DJ', priority: 'high' }),
      ),
    );
    expect(await screen.findByText('Applied')).toBeInTheDocument();
  });

  it('lets the user dismiss a proposal without any change', async () => {
    store.chatReply = {
      reply: 'Consider moving money.',
      proposals: [
        {
          type: 'reallocate',
          summary: 'Move to decor',
          fromCategory: 'venue',
          toCategory: 'decoration',
          amount: 10_000,
        },
      ],
    };
    const user = userEvent.setup();
    open('copilot');
    await user.type(await screen.findByLabelText('Your question'), 'Decoration budget grew');
    await user.click(screen.getByRole('button', { name: /Send/ }));
    await user.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(await screen.findByText('Dismissed')).toBeInTheDocument();
    expect(api.updateEvent).not.toHaveBeenCalled();
  });

  it('shows an understandable error with a retry when the AI is unavailable', async () => {
    const { ApiError } = await import('../lib/api');
    vi.mocked(api.chat).mockRejectedValueOnce(
      new ApiError(503, 'AI_NOT_CONFIGURED', 'The AI assistant is not configured on this server yet.'),
    );
    const user = userEvent.setup();
    open('copilot');
    await user.click(await screen.findByRole('button', { name: 'Suggest a rain contingency plan.' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The AI assistant is not configured on this server yet.',
    );

    store.chatReply = { reply: 'Use a covered hall.', proposals: [] };
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Use a covered hall.')).toBeInTheDocument();
  });

  it('sends earlier turns as history on the next question, and retry does not duplicate the message', async () => {
    const { ApiError } = await import('../lib/api');
    store.chatReply = { reply: 'First answer.', proposals: [] };
    const user = userEvent.setup();
    open('copilot');
    await user.type(await screen.findByLabelText('Your question'), 'First question');
    await user.click(screen.getByRole('button', { name: /Send/ }));
    await screen.findByText('First answer.');

    vi.mocked(api.chat).mockRejectedValueOnce(
      new ApiError(502, 'AI_UNAVAILABLE', 'The AI service is temporarily unavailable. Please try again shortly.'),
    );
    store.chatReply = { reply: 'Second answer.', proposals: [] };
    await user.type(screen.getByLabelText('Your question'), 'Second question');
    await user.click(screen.getByRole('button', { name: /Send/ }));
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByText('Second answer.');

    const history = [
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer.' },
    ];
    expect(vi.mocked(api.chat).mock.calls.at(-1)).toEqual([store.ws.event.id, 'Second question', history]);
    expect(screen.getAllByText('Second question')).toHaveLength(1);
  });

  it('limits message length', async () => {
    open('copilot');
    expect(await screen.findByLabelText('Your question')).toHaveAttribute('maxlength', '1000');
  });
});

describe('Overview tab', () => {
  it('shows an over-budget alert and handles a missing date', async () => {
    seed({ expenses: [makeExpense({ category: 'venue', actualAmount: 900_000 })] });
    store.ws.event = { ...store.ws.event, eventDate: null };
    open('');
    expect(await screen.findByText(/You are over budget/)).toBeInTheDocument();
    expect(screen.getByText(/No event date yet/)).toBeInTheDocument();
    expect(screen.getAllByText('Date not set').length).toBeGreaterThan(0);
  });

  it('handles an event whose date has passed', async () => {
    store.ws.event = { ...store.ws.event, eventDate: addDays(TODAY, -3) };
    open('');
    expect(await screen.findByText(/This event date has passed/)).toBeInTheDocument();
  });
});

describe('Tab navigation', () => {
  it('links every tab to /events/:id/<tab> however many tabs have been opened (no stacking paths)', async () => {
    const user = userEvent.setup();
    open('plan');
    const nav = await screen.findByRole('navigation', { name: 'Event sections' });
    const id = store.ws.event.id;

    for (const name of ['Budget', 'Tasks', 'Vendors', 'Copilot', 'AI plan']) {
      await user.click(within(nav).getByRole('link', { name }));
    }
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      `/events/${id}`,
      `/events/${id}/plan`,
      `/events/${id}/budget`,
      `/events/${id}/tasks`,
      `/events/${id}/vendors`,
      `/events/${id}/copilot`,
    ]);
  });
});
