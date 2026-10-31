// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent, makeExpense, makeTask, makeVendor } from '@shared/test-utils';
import { renderWithProviders } from '../test/render';
import { ExpenseDialog } from './budget/ExpenseDialog';
import { EditEventDialog } from './overview/EditEventDialog';
import { TaskDialog } from './tasks/TaskDialog';
import { VendorDialog } from './vendors/VendorDialog';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return {
    ...actual,
    api: {
      createVendor: vi.fn(),
      updateVendor: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      updateEvent: vi.fn(),
    },
  };
});

const { api } = await import('../lib/api');
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('every field in the dialogs reaches the server', () => {
  it('TaskDialog sends all its fields', async () => {
    vi.mocked(api.createTask).mockResolvedValue(makeTask());
    const vendor = makeVendor({ name: 'DJ Rohan' });
    const user = userEvent.setup();
    renderWithProviders(<TaskDialog eventId="e1" task={null} vendors={[vendor]} onClose={onClose} />);

    await user.type(screen.getByLabelText('Task'), 'Confirm DJ');
    await user.type(screen.getByLabelText(/Description/), 'Share the playlist');
    await user.type(screen.getByLabelText(/Due date/), '2026-12-01');
    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.selectOptions(screen.getByLabelText('Status'), 'in_progress');
    await user.selectOptions(screen.getByLabelText('Category'), 'entertainment');
    await user.selectOptions(screen.getByLabelText(/Related vendor/), vendor.id);
    await user.type(screen.getByLabelText(/Notes/), 'Call after 5pm');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(api.createTask).toHaveBeenCalledWith('e1', {
      title: 'Confirm DJ',
      description: 'Share the playlist',
      dueDate: '2026-12-01',
      priority: 'high',
      status: 'in_progress',
      category: 'entertainment',
      vendorId: vendor.id,
      notes: 'Call after 5pm',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('VendorDialog sends all its fields', async () => {
    vi.mocked(api.createVendor).mockResolvedValue(makeVendor());
    const user = userEvent.setup();
    renderWithProviders(<VendorDialog eventId="e1" vendor={null} onClose={onClose} />);

    await user.type(screen.getByLabelText('Vendor name'), 'Tent House');
    await user.selectOptions(screen.getByLabelText('Category'), 'decorator');
    await user.type(screen.getByLabelText(/Contact details/), '98200 11111');
    await user.type(screen.getByLabelText(/Follow-up date/), '2026-12-05');
    await user.type(screen.getByLabelText(/^Quoted price/), '90000');
    await user.type(screen.getByLabelText(/^Booking advance/), '20000');
    await user.selectOptions(screen.getByLabelText('Booking status'), 'booked');
    await user.selectOptions(screen.getByLabelText('Payment status'), 'advance_paid');
    await user.type(screen.getByLabelText(/Notes/), 'Includes lighting');
    await user.click(screen.getByRole('button', { name: 'Add vendor' }));

    expect(api.createVendor).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({
        name: 'Tent House',
        category: 'decorator',
        contact: '98200 11111',
        followUpDate: '2026-12-05',
        quotedPrice: 90_000,
        advanceAmount: 20_000,
        bookingStatus: 'booked',
        paymentStatus: 'advance_paid',
        notes: 'Includes lighting',
      }),
    );
  });

  it('EditEventDialog sends every edited field', async () => {
    vi.mocked(api.updateEvent).mockResolvedValue({ event: makeEvent() });
    const event = makeEvent({ name: 'Old', city: '', theme: '', culturalNotes: '' });
    const user = userEvent.setup();
    renderWithProviders(<EditEventDialog event={event} onClose={onClose} />);

    await user.clear(screen.getByLabelText('Event name'));
    await user.type(screen.getByLabelText('Event name'), 'New name');
    await user.type(screen.getByLabelText(/City/), 'Mumbai');
    await user.clear(screen.getByLabelText(/^Total budget/));
    await user.type(screen.getByLabelText(/^Total budget/), '900000');
    await user.clear(screen.getByLabelText('Guests'));
    await user.type(screen.getByLabelText('Guests'), '120');
    await user.type(screen.getByLabelText(/Theme/), 'Vintage');
    await user.selectOptions(screen.getByLabelText('Food preference'), 'non_vegetarian');
    await user.selectOptions(screen.getByLabelText('Indoor or outdoor'), 'indoor');
    await user.type(screen.getByLabelText(/^Cultural or personal requirements/), 'No onion or garlic');
    await user.clear(screen.getByLabelText(/Event date/));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(api.updateEvent).toHaveBeenCalledWith(
      event.id,
      expect.objectContaining({
        name: 'New name',
        city: 'Mumbai',
        totalBudget: 900_000,
        guestCount: 120,
        theme: 'Vintage',
        foodPreference: 'non_vegetarian',
        venueSetting: 'indoor',
        culturalNotes: 'No onion or garlic',
        eventDate: null,
      }),
    );
  });

  it('ExpenseDialog sends the linked vendor and notes', async () => {
    vi.mocked(api.updateExpense).mockResolvedValue(makeExpense());
    const vendor = makeVendor({ name: 'DJ Rohan' });
    const expense = makeExpense({ title: 'Sound', estimatedAmount: 10_000, actualAmount: 0 });
    const user = userEvent.setup();
    renderWithProviders(<ExpenseDialog eventId="e1" expense={expense} vendors={[vendor]} onClose={onClose} />);

    await user.selectOptions(screen.getByLabelText(/vendor/i), vendor.id);
    await user.type(screen.getByLabelText(/Notes/), 'Paid cash');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(api.updateExpense).toHaveBeenCalledWith(
      'e1',
      expense.id,
      expect.objectContaining({ vendorId: vendor.id, notes: 'Paid cash' }),
    );
  });
});
