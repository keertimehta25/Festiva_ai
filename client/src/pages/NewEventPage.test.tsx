// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent } from '@shared/test-utils';
import { renderWithProviders } from '../test/render';
import NewEventPage from './NewEventPage';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, api: { createEvent: vi.fn(), listEvents: vi.fn(async () => []) } };
});

const { api } = await import('../lib/api');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NewEventPage', () => {
  it('creates the event and opens its plan tab', async () => {
    const event = makeEvent({ id: 'abc-123' });
    vi.mocked(api.createEvent).mockResolvedValue({ event, tasks: [], notes: [] });
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/" element={<NewEventPage />} />
        <Route path="/events/:id/plan" element={<p>Plan tab for the new event</p>} />
      </Routes>,
    );

    await user.type(screen.getByLabelText('Event name'), 'Anaya’s birthday');
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '50000');
    await user.type(screen.getByLabelText('Expected guests'), '40');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(await screen.findByText('Plan tab for the new event')).toBeInTheDocument();
    expect(api.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Anaya’s birthday', totalBudget: 50_000, guestCount: 40 }),
    );
  });
});
