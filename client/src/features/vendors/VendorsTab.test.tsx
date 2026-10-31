// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent, makeExpense, makeTask, makeVendor } from '@shared/test-utils';
import type { Workspace } from '@shared/types';
import { checkA11y } from '../../test/a11y';
import { renderWithProviders } from '../../test/render';
import VendorsTab from './VendorsTab';

vi.mock('../../hooks/useToday', () => ({ getToday: () => '2026-11-01' }));
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, api: { deleteVendor: vi.fn(), createVendor: vi.fn(), updateVendor: vi.fn() } };
});

const { api } = await import('../../lib/api');

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return { event: makeEvent(), tasks: [], expenses: [], vendors: [], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VendorsTab', () => {
  it('invites the user to add a first vendor', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VendorsTab workspace={workspace()} />);

    expect(screen.getByText('No vendors yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add vendor/ }));
    expect(screen.getByRole('dialog', { name: 'Add vendor' })).toBeInTheDocument();
  });

  it('lists vendors in category order with payments, notes, linked tasks and expenses', async () => {
    const venue = makeVendor({ name: 'Garden Lawn', category: 'venue', quotedPrice: 200_000, advanceAmount: 50_000 });
    const caterer = makeVendor({
      name: 'Sharma Caterers',
      category: 'caterer',
      bookingStatus: 'booked',
      paymentStatus: 'advance_paid',
      contact: '98200 00000',
      notes: 'Tasting on Sunday',
      quotedPrice: 100_000,
      advanceAmount: 20_000,
    });
    const chased = makeVendor({
      name: 'Tent House',
      category: 'decorator',
      bookingStatus: 'quoted',
      followUpDate: '2026-11-01',
    });
    const ws = workspace({
      vendors: [caterer, venue, chased],
      tasks: [makeTask({ title: 'Confirm menu', vendorId: caterer.id })],
      expenses: [makeExpense({ vendorId: caterer.id, actualAmount: 20_000 })],
    });
    const { container } = renderWithProviders(<VendorsTab workspace={ws} />);

    const [firstVendor] = screen.getAllByRole('listitem');
    expect(within(firstVendor ?? document.body).getByText('Garden Lawn')).toBeInTheDocument();
    expect(screen.getByText('Contact: 98200 00000')).toBeInTheDocument();
    expect(screen.getByText('Tasting on Sunday')).toBeInTheDocument();
    expect(screen.getByText('Linked tasks: Confirm menu')).toBeInTheDocument();
    expect(screen.getByText(/Expenses logged/)).toBeInTheDocument();
    expect(screen.getByText(/Follow-ups due:/)).toBeInTheDocument();
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('opens the edit dialog for a vendor', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VendorsTab workspace={workspace({ vendors: [makeVendor({ name: 'DJ Rohan' })] })} />);

    await user.click(screen.getByRole('button', { name: 'Edit DJ Rohan' }));
    expect(screen.getByRole('dialog', { name: 'Edit vendor' })).toBeInTheDocument();
  });

  it('deletes a vendor after confirmation', async () => {
    const vendor = makeVendor({ name: 'DJ Rohan' });
    vi.mocked(api.deleteVendor).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<VendorsTab workspace={workspace({ vendors: [vendor] })} />);

    await user.click(screen.getByRole('button', { name: 'Delete DJ Rohan' }));
    await user.click(screen.getByRole('button', { name: 'Delete vendor' }));

    expect(await screen.findByText('Vendor deleted')).toBeInTheDocument();
    expect(api.deleteVendor).toHaveBeenCalledWith(expect.any(String), vendor.id);
  });

  it('reports a failed delete', async () => {
    vi.mocked(api.deleteVendor).mockRejectedValue(new Error('Vendor is locked'));
    const user = userEvent.setup();
    renderWithProviders(<VendorsTab workspace={workspace({ vendors: [makeVendor({ name: 'DJ Rohan' })] })} />);

    await user.click(screen.getByRole('button', { name: 'Delete DJ Rohan' }));
    await user.click(screen.getByRole('button', { name: 'Delete vendor' }));
    expect(await screen.findByText('Vendor is locked')).toBeInTheDocument();
  });

  it('can cancel a delete', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VendorsTab workspace={workspace({ vendors: [makeVendor({ name: 'DJ Rohan' })] })} />);

    await user.click(screen.getByRole('button', { name: 'Delete DJ Rohan' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
