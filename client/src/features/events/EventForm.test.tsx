// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { checkA11y } from '../../test/a11y';
import { renderWithProviders } from '../../test/render';
import { EventForm } from './EventForm';

function setup() {
  const onSubmit = vi.fn(async () => undefined);
  const view = renderWithProviders(<EventForm onSubmit={onSubmit} submitLabel="Create event" busy={false} />);
  return { onSubmit, user: userEvent.setup(), ...view };
}

describe('EventForm', () => {
  it('has no detectable accessibility violations', async () => {
    const { container } = setup();
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('shows clear errors and does not submit an empty form', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(await screen.findByText(/Please fix 3 fields below/)).toBeInTheDocument();
    expect(screen.getByLabelText('Event name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Event name')).toHaveAccessibleDescription('Event name is required');
    expect(screen.getByLabelText('Estimated budget (₹)')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ['zero guests', '0', 'At least 1 guest is needed'],
    ['negative guests', '-4', 'Enter the number of guests'],
    ['fractional guests', '12.5', 'Enter the number of guests'],
    ['text guests', 'many', 'Enter the number of guests'],
  ])('rejects %s', async (_label, value, message) => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Event name'), 'Party');
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '50000');
    await user.type(screen.getByLabelText('Expected guests'), value);
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(await screen.findAllByText(new RegExp(message))).not.toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a date in the past and a negative budget', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Event name'), 'Party');
    await user.type(screen.getByLabelText('Expected guests'), '40');
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '-500');
    await user.type(screen.getByLabelText(/Event date/), '2020-01-01');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect((await screen.findAllByText(/Choose today or a future date/)).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Estimated budget (₹)')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('warns about a very tight budget before submitting', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Event name'), 'Big do');
    await user.type(screen.getByLabelText('Expected guests'), '500');
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '20000');
    expect(await screen.findByText(/very tight/)).toBeInTheDocument();
  });

  it('accepts Indian-style number formatting and submits cleaned values with defaults', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByLabelText('Birthday'));
    await user.type(screen.getByLabelText('Event name'), '  Riya’s 10th  ');
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '1,50,000');
    await user.type(screen.getByLabelText('Expected guests'), '40');
    await user.click(screen.getByLabelText('Sustainability'));
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Riya’s 10th',
        eventType: 'birthday',
        totalBudget: 150_000,
        guestCount: 40,
        durationHours: 4,
        foodPreference: 'mixed',
        priorities: ['sustainability'],
        eventDate: null,
        currency: 'INR',
      }),
    );
  });

  it('shows server-side field errors when the API rejects the input', async () => {
    const { ApiError } = await import('../../lib/api');
    const onSubmit = vi.fn(async () => {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Some fields need attention', { name: ['Name already used'] });
    });
    const user = userEvent.setup();
    renderWithProviders(<EventForm onSubmit={onSubmit} submitLabel="Create event" busy={false} />);
    await user.type(screen.getByLabelText('Event name'), 'Party');
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '50000');
    await user.type(screen.getByLabelText('Expected guests'), '40');
    await user.click(screen.getByRole('button', { name: 'Create event' }));
    expect((await screen.findAllByText(/Name already used/)).length).toBeGreaterThan(0);
  });
});
