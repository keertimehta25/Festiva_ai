// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAllocations, makeEvent, makeExpense, makeTask, makeVendor } from '@shared/test-utils';
import { checkA11y } from '../test/a11y';
import { renderWithProviders } from '../test/render';
import { AllocationDialog } from './budget/AllocationDialog';
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

const { api, ApiError } = await import('../lib/api');
const onClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VendorDialog', () => {
  it('adds a vendor with amounts converted to numbers and closes on success', async () => {
    vi.mocked(api.createVendor).mockResolvedValue(makeVendor());
    const user = userEvent.setup();
    renderWithProviders(<VendorDialog eventId="evt" vendor={null} onClose={onClose} />);

    await user.type(screen.getByLabelText('Vendor name'), 'Royal Caterers');
    await user.type(screen.getByLabelText(/Quoted price/), '1,20,000');
    await user.type(screen.getByLabelText(/Booking advance/), '20000');
    await user.click(screen.getByRole('button', { name: 'Add vendor' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(api.createVendor).toHaveBeenCalledWith(
      'evt',
      expect.objectContaining({
        name: 'Royal Caterers',
        quotedPrice: 120_000,
        advanceAmount: 20_000,
        followUpDate: null,
      }),
    );
  });

  it('refuses an advance that is larger than the quoted price and keeps the dialog open', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VendorDialog eventId="evt" vendor={null} onClose={onClose} />);

    await user.type(screen.getByLabelText('Vendor name'), 'Hall');
    await user.type(screen.getByLabelText(/Quoted price/), '1000');
    await user.type(screen.getByLabelText(/Booking advance/), '5000');
    await user.click(screen.getByRole('button', { name: 'Add vendor' }));

    expect(await screen.findByText('The advance cannot be more than the quoted price')).toBeInTheDocument();
    expect(api.createVendor).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('starts from the saved values when editing and sends an update', async () => {
    vi.mocked(api.updateVendor).mockResolvedValue(makeVendor());
    const vendor = makeVendor({ name: 'Hall A', quotedPrice: 90_000, notes: 'Near the station' });
    const user = userEvent.setup();
    renderWithProviders(<VendorDialog eventId="evt" vendor={vendor} onClose={onClose} />);

    expect(screen.getByLabelText('Vendor name')).toHaveValue('Hall A');
    expect(screen.getByLabelText(/Quoted price/)).toHaveValue('90000');
    await user.clear(screen.getByLabelText('Vendor name'));
    await user.type(screen.getByLabelText('Vendor name'), 'Hall B');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(api.updateVendor).toHaveBeenCalledWith('evt', vendor.id, expect.objectContaining({ name: 'Hall B' }));
    });
  });

  it('shows the server’s field message and an error banner when saving fails', async () => {
    vi.mocked(api.createVendor).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Some fields need attention', { name: ['That name is already used'] }),
    );
    const user = userEvent.setup();
    renderWithProviders(<VendorDialog eventId="evt" vendor={null} onClose={onClose} />);

    await user.type(screen.getByLabelText('Vendor name'), 'Hall');
    await user.click(screen.getByRole('button', { name: 'Add vendor' }));

    expect(await screen.findByText('That name is already used')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has no detectable accessibility violations', async () => {
    renderWithProviders(<VendorDialog eventId="evt" vendor={null} onClose={onClose} />);
    expect(await checkA11y(document.body)).toHaveNoViolations();
  });
});

describe('EditEventDialog', () => {
  const event = makeEvent({ name: 'Riya & Arjun', guestCount: 150, totalBudget: 800_000, eventDate: '2027-02-14' });

  it('sends only valid, converted values and closes', async () => {
    vi.mocked(api.updateEvent).mockResolvedValue({ event });
    const user = userEvent.setup();
    renderWithProviders(<EditEventDialog event={event} onClose={onClose} />);

    await user.clear(screen.getByLabelText('Guests'));
    await user.type(screen.getByLabelText('Guests'), '220');
    await user.clear(screen.getByLabelText(/Event date/));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(api.updateEvent).toHaveBeenCalledWith(
      event.id,
      expect.objectContaining({ guestCount: 220, totalBudget: 800_000, eventDate: null }),
    );
  });

  it('explains an invalid budget instead of saving', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditEventDialog event={event} onClose={onClose} />);

    await user.clear(screen.getByLabelText(/Total budget/));
    await user.type(screen.getByLabelText(/Total budget/), 'lots');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter a valid amount')).toBeInTheDocument();
    expect(api.updateEvent).not.toHaveBeenCalled();
  });
});

describe('AllocationDialog', () => {
  const event = makeEvent({
    totalBudget: 100_000,
    allocations: makeAllocations({ venue: 40_000, catering: 30_000 }),
  });

  it('shows how much is allocated and unallocated', () => {
    renderWithProviders(<AllocationDialog event={event} onClose={onClose} />);
    expect(screen.getByText(/Allocated ₹70,000 of ₹1,00,000/)).toBeInTheDocument();
    expect(screen.getByText(/Unallocated: ₹30,000/)).toBeInTheDocument();
  });

  it('blocks saving when the categories add up to more than the budget', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AllocationDialog event={event} onClose={onClose} />);

    await user.clear(screen.getByLabelText(/^Venue/));
    await user.type(screen.getByLabelText(/^Venue/), '90000');

    expect(screen.getByText(/more than your total budget/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save budgets' })).toBeDisabled();
  });

  it('flags a category that is not a whole number', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AllocationDialog event={event} onClose={onClose} />);

    await user.clear(screen.getByLabelText(/^Venue/));
    await user.type(screen.getByLabelText(/^Venue/), '12.5');

    expect(screen.getByText('Enter a whole number')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save budgets' })).toBeDisabled();
  });

  it('saves the new split and closes', async () => {
    vi.mocked(api.updateEvent).mockResolvedValue({ event });
    const user = userEvent.setup();
    renderWithProviders(<AllocationDialog event={event} onClose={onClose} />);

    await user.clear(screen.getByLabelText(/^Venue/));
    await user.type(screen.getByLabelText(/^Venue/), '50000');
    await user.click(screen.getByRole('button', { name: 'Save budgets' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(api.updateEvent).toHaveBeenCalledWith(
      event.id,
      expect.objectContaining({ allocations: expect.objectContaining({ venue: 50_000, catering: 30_000 }) }),
    );
  });

  it('shows an error banner and stays open when the save fails', async () => {
    vi.mocked(api.updateEvent).mockRejectedValue(new ApiError(502, 'DATABASE_ERROR', 'The database could not save'));
    const user = userEvent.setup();
    renderWithProviders(<AllocationDialog event={event} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Save budgets' }));

    expect(await screen.findByText(/could not save/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('TaskDialog', () => {
  it('edits an existing task and links a vendor', async () => {
    vi.mocked(api.updateTask).mockResolvedValue(makeTask());
    const vendor = makeVendor({ name: 'Hall A' });
    const task = makeTask({ title: 'Book the hall', dueDate: '2027-01-10' });
    const user = userEvent.setup();
    renderWithProviders(<TaskDialog eventId="evt" task={task} vendors={[vendor]} onClose={onClose} />);

    expect(screen.getByLabelText('Task')).toHaveValue('Book the hall');
    await user.selectOptions(screen.getByLabelText(/Related vendor/), vendor.id);
    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(api.updateTask).toHaveBeenCalledWith(
        'evt',
        task.id,
        expect.objectContaining({ vendorId: vendor.id, priority: 'high', dueDate: '2027-01-10' }),
      );
    });
  });

  it('requires a title', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskDialog eventId="evt" task={null} vendors={[]} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(await screen.findByText('Task title is required')).toBeInTheDocument();
    expect(api.createTask).not.toHaveBeenCalled();
  });

  it('closes without saving when cancelled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskDialog eventId="evt" task={null} vendors={[]} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(api.createTask).not.toHaveBeenCalled();
  });
});

describe('ExpenseDialog', () => {
  it('links an expense to a vendor and sends numeric amounts', async () => {
    vi.mocked(api.createExpense).mockResolvedValue(makeExpense());
    const vendor = makeVendor({ name: 'Decor Co' });
    const user = userEvent.setup();
    renderWithProviders(<ExpenseDialog eventId="evt" expense={null} vendors={[vendor]} onClose={onClose} />);

    await user.type(screen.getByLabelText('What is it for?'), 'Stage flowers');
    await user.selectOptions(screen.getByLabelText('Category'), 'decoration');
    await user.selectOptions(screen.getByLabelText(/^Vendor/), vendor.id);
    await user.type(screen.getByLabelText(/Estimated amount/), '25000');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    await waitFor(() => {
      expect(api.createExpense).toHaveBeenCalledWith(
        'evt',
        expect.objectContaining({
          title: 'Stage flowers',
          category: 'decoration',
          vendorId: vendor.id,
          estimatedAmount: 25_000,
          actualAmount: 0,
        }),
      );
    });
  });

  it('asks for an amount when both are empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExpenseDialog eventId="evt" expense={null} vendors={[]} onClose={onClose} />);
    await user.type(screen.getByLabelText('What is it for?'), 'Gift');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(await screen.findByText('Enter an estimated or an actual amount')).toBeInTheDocument();
  });
});
