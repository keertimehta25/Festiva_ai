// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeExpense, makeEvent, makeTask, makeVendor } from '@shared/test-utils';
import type { Workspace } from '@shared/types';
import { checkA11y } from '../../test/a11y';
import { renderWithProviders } from '../../test/render';
import { OverviewTab } from './OverviewTab';

const TODAY = '2026-11-01';

vi.mock('../../hooks/useToday', () => ({ getToday: () => '2026-11-01' }));
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, api: { deleteEvent: vi.fn(), updateEvent: vi.fn(), listEvents: vi.fn(async () => []) } };
});

const { api } = await import('../../lib/api');

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    event: makeEvent({ eventDate: '2026-12-01', totalBudget: 800_000 }),
    tasks: [],
    expenses: [],
    vendors: [],
    ...overrides,
  };
}

function renderOverview(ws: Workspace) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<OverviewTab workspace={ws} />} />
      <Route path="/dashboard" element={<p>Dashboard page</p>} />
    </Routes>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OverviewTab', () => {
  it('summarises progress, budget and vendors without accessibility violations', async () => {
    const ws = workspace({
      tasks: [
        makeTask({ title: 'Book caterer', status: 'completed' }),
        makeTask({ title: 'Send invites', dueDate: '2026-11-08' }),
      ],
      expenses: [makeExpense({ actualAmount: 100_000 })],
      vendors: [makeVendor({ bookingStatus: 'booked', quotedPrice: 50_000, advanceAmount: 10_000 })],
    });
    const { container } = renderOverview(ws);

    expect(screen.getByText('1 of 2 done')).toBeInTheDocument();
    expect(screen.getByText('Send invites')).toBeInTheDocument();
    expect(screen.getByText(/% of .* spent/)).toBeInTheDocument();
    expect(screen.getByText(/still to pay/)).toBeInTheDocument();
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('says so when nothing is due soon', () => {
    renderOverview(workspace());
    expect(screen.getByText('Nothing due in the next two weeks.')).toBeInTheDocument();
  });

  it('warns about overdue tasks (singular and plural) and vendor follow-ups', () => {
    const one = renderOverview(workspace({ tasks: [makeTask({ dueDate: '2026-10-20' })] }));
    expect(screen.getByText(/1 overdue task\./)).toBeInTheDocument();
    one.unmount();

    renderOverview(
      workspace({
        tasks: [makeTask({ dueDate: '2026-10-20' }), makeTask({ dueDate: '2026-10-21' })],
        vendors: [makeVendor({ name: 'Sharma Caterers', followUpDate: TODAY })],
      }),
    );
    expect(screen.getByText(/2 overdue tasks\./)).toBeInTheDocument();
    expect(screen.getByText(/Vendor follow-ups due: Sharma Caterers/)).toBeInTheDocument();
  });

  it('shows notices for a missing date, a past date and an overspent budget', () => {
    const noDate = renderOverview(workspace({ event: makeEvent({ eventDate: null }) }));
    expect(screen.getByText(/No event date yet/)).toBeInTheDocument();
    noDate.unmount();

    const past = renderOverview(workspace({ event: makeEvent({ eventDate: '2026-01-01' }) }));
    expect(screen.getByText(/This event date has passed/)).toBeInTheDocument();
    past.unmount();

    renderOverview(
      workspace({
        event: makeEvent({ totalBudget: 100_000, eventDate: '2026-12-01' }),
        expenses: [makeExpense({ actualAmount: 150_000 })],
      }),
    );
    expect(screen.getByText(/You are over budget/)).toBeInTheDocument();
  });

  it('lists the optional event details that were filled in', () => {
    renderOverview(
      workspace({
        event: makeEvent({
          venuePreference: 'Lakeside lawn',
          theme: 'Marigold',
          colors: 'Orange and cream',
          culturalNotes: 'Early muhurat',
          priorities: ['luxury'],
        }),
      }),
    );
    for (const text of ['Lakeside lawn', 'Marigold', 'Orange and cream', 'Early muhurat']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByText('Priorities')).toBeInTheDocument();
  });

  it('opens the edit dialog', async () => {
    const user = userEvent.setup();
    renderOverview(workspace());

    await user.click(screen.getByRole('button', { name: /Edit details/ }));
    expect(screen.getByRole('dialog', { name: 'Edit event details' })).toBeInTheDocument();
  });

  it('deletes the event after confirmation and returns to the dashboard', async () => {
    vi.mocked(api.deleteEvent).mockResolvedValue(undefined);
    const user = userEvent.setup();
    const ws = workspace();
    renderOverview(ws);

    await user.click(screen.getByRole('button', { name: /Delete this event/ }));
    expect(screen.getByRole('dialog', { name: 'Delete this event?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete event' }));

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(api.deleteEvent).toHaveBeenCalledWith(ws.event.id);
  });

  it('keeps the event and says why when deleting fails', async () => {
    vi.mocked(api.deleteEvent).mockRejectedValue(new Error('Database is down'));
    const user = userEvent.setup();
    renderOverview(workspace());

    await user.click(screen.getByRole('button', { name: /Delete this event/ }));
    await user.click(screen.getByRole('button', { name: 'Delete event' }));

    expect(await screen.findByText('Database is down')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('uses a generic message when the failure is not an Error', async () => {
    vi.mocked(api.deleteEvent).mockRejectedValue('nope');
    const user = userEvent.setup();
    renderOverview(workspace());

    await user.click(screen.getByRole('button', { name: /Delete this event/ }));
    await user.click(screen.getByRole('button', { name: 'Delete event' }));
    expect(await screen.findByText('Could not delete the event')).toBeInTheDocument();
  });

  it('can cancel the delete confirmation', async () => {
    const user = userEvent.setup();
    renderOverview(workspace());

    await user.click(screen.getByRole('button', { name: /Delete this event/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.deleteEvent).not.toHaveBeenCalled();
  });
});
