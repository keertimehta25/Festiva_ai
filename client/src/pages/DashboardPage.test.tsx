// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent } from '@shared/test-utils';
import type { EventWithSummary } from '@shared/types';
import { checkA11y } from '../test/a11y';
import { renderWithProviders } from '../test/render';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, api: { listEvents: vi.fn(), deleteEvent: vi.fn(), createSample: vi.fn() } };
});

const { api, ApiError } = await import('../lib/api');
const { default: DashboardPage } = await import('./DashboardPage');

function item(overrides: Partial<EventWithSummary['event']> = {}, percentConsumed = 30): EventWithSummary {
  const event = makeEvent({ name: 'Riya & Arjun', city: 'Jaipur', guestCount: 150, ...overrides });
  return {
    event,
    summary: { daysToEvent: 40, taskProgressPercent: 40, totalActual: 240_000, percentConsumed },
  };
}

function renderDashboard() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/events/:id" element={<p>Workspace opened</p>} />
    </Routes>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardPage', () => {
  it('lists each event with its progress, location and guest count', async () => {
    vi.mocked(api.listEvents).mockResolvedValue([item(), item({ name: 'Mehta Anniversary', city: '' }, 120)]);
    renderDashboard();

    expect(await screen.findByRole('link', { name: 'Riya & Arjun' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mehta Anniversary' })).toBeInTheDocument();
    expect(screen.getByText(/Jaipur/)).toBeInTheDocument();
    expect(screen.getAllByText('150 guests')).toHaveLength(2);
    expect(screen.getByRole('progressbar', { name: 'Task progress for Riya & Arjun' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Budget used for Mehta Anniversary' })).toBeInTheDocument();
  });

  it('offers a sample wedding when there are no events, and opens it', async () => {
    vi.mocked(api.listEvents).mockResolvedValue([]);
    vi.mocked(api.createSample).mockResolvedValue({ event: makeEvent({ id: 'sample-1' }), created: true });
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText('No events yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Explore a sample wedding/ }));
    expect(await screen.findByText('Workspace opened')).toBeInTheDocument();
  });

  it('tells the user when the sample cannot be loaded', async () => {
    vi.mocked(api.listEvents).mockResolvedValue([]);
    vi.mocked(api.createSample).mockRejectedValue(new Error('Limit reached'));
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: /Explore a sample wedding/ }));
    expect(await screen.findByText('Limit reached')).toBeInTheDocument();
  });

  it('does not offer a second sample when one already exists', async () => {
    vi.mocked(api.listEvents).mockResolvedValue([item({ isSample: true })]);
    renderDashboard();
    expect(await screen.findByText('Sample data')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add a sample wedding/ })).not.toBeInTheDocument();
  });

  it('asks before deleting an event, and Cancel keeps it', async () => {
    vi.mocked(api.listEvents).mockResolvedValue([item()]);
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: 'Delete Riya & Arjun' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/permanently deleted/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(api.deleteEvent).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Riya & Arjun' })).toBeInTheDocument();
  });

  it('deletes the event after confirmation', async () => {
    const first = item();
    vi.mocked(api.listEvents).mockResolvedValueOnce([first]).mockResolvedValue([]);
    vi.mocked(api.deleteEvent).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: 'Delete Riya & Arjun' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete event' }));

    await waitFor(() => {
      expect(api.deleteEvent).toHaveBeenCalledWith(first.event.id);
    });
    expect(await screen.findByText('Event deleted')).toBeInTheDocument();
  });

  it('reports a failed delete', async () => {
    vi.mocked(api.listEvents).mockResolvedValue([item()]);
    vi.mocked(api.deleteEvent).mockRejectedValue(new ApiError(502, 'DATABASE_ERROR', 'The database could not delete'));
    const user = userEvent.setup();
    renderDashboard();

    await user.click(await screen.findByRole('button', { name: 'Delete Riya & Arjun' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete event' }));
    expect(await screen.findByText('The database could not delete')).toBeInTheDocument();
  });

  it('shows a retryable error when the list cannot be loaded', async () => {
    vi.mocked(api.listEvents).mockRejectedValueOnce(new ApiError(502, 'AI_UNAVAILABLE', 'Server is down'));
    vi.mocked(api.listEvents).mockResolvedValue([item()]);
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText(/Server is down/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Try again|Retry/ }));
    expect(await screen.findByRole('link', { name: 'Riya & Arjun' })).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    vi.mocked(api.listEvents).mockResolvedValue([item()]);
    const { container } = renderDashboard();
    await screen.findByRole('link', { name: 'Riya & Arjun' });
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
