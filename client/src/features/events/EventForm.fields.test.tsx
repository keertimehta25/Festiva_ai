// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { addDays, todayInZone } from '@shared/dates';
import { ApiError } from '../../lib/api';
import { renderWithProviders } from '../../test/render';
import { EventForm } from './EventForm';

function setup(onSubmit = vi.fn(async () => undefined)) {
  renderWithProviders(<EventForm onSubmit={onSubmit} submitLabel="Create event" busy={false} />);
  return { onSubmit, user: userEvent.setup() };
}

describe('EventForm fields', () => {
  it('submits every field the user filled in', async () => {
    const { onSubmit, user } = setup();
    const date = addDays(todayInZone(), 60);

    await user.type(screen.getByLabelText('Event name'), 'Anaya’s wedding');
    await user.type(screen.getByLabelText(/Event date/), date);
    await user.type(screen.getByLabelText(/^City/), 'Pune');
    await user.type(screen.getByLabelText(/^Venue preference/), 'Lawn');
    await user.click(screen.getByLabelText('The date is approximate'));
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '800000');
    await user.type(screen.getByLabelText('Expected guests'), '250');
    await user.clear(screen.getByLabelText(/^Duration/));
    await user.type(screen.getByLabelText(/^Duration/), '8');
    await user.type(screen.getByLabelText(/^Theme or style/), 'Royal garden');
    await user.type(screen.getByLabelText(/^Preferred colours/), 'Maroon and gold');
    await user.selectOptions(screen.getByLabelText('Food preference'), 'vegetarian');
    await user.selectOptions(screen.getByLabelText('Indoor or outdoor'), 'outdoor');
    await user.type(screen.getByLabelText(/^Cultural or personal requirements/), 'Early morning rituals');
    await user.click(screen.getByLabelText('Luxury'));
    await user.click(screen.getByLabelText('Sustainability'));
    await user.click(screen.getByLabelText('Luxury'));
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Anaya’s wedding',
        eventDate: date,
        dateIsApproximate: true,
        city: 'Pune',
        venuePreference: 'Lawn',
        totalBudget: 800_000,
        guestCount: 250,
        durationHours: 8,
        theme: 'Royal garden',
        colors: 'Maroon and gold',
        foodPreference: 'vegetarian',
        venueSetting: 'outdoor',
        culturalNotes: 'Early morning rituals',
        priorities: ['sustainability'],
      }),
    );
  });

  it('warns about unusual budget and guest combinations before submitting', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Event name'), 'Tiny budget');
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '2000');
    await user.type(screen.getByLabelText('Expected guests'), '500');

    expect(await screen.findByText(/very tight/)).toBeInTheDocument();
  });

  it('shows the server’s field errors and message when saving fails', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(400, 'VALIDATION_ERROR', 'Some fields need attention', { name: ['Name already used'] }),
      );
    const { user } = setup(onSubmit);
    await user.type(screen.getByLabelText('Event name'), 'Party');
    await user.type(screen.getByLabelText('Estimated budget (₹)'), '50000');
    await user.type(screen.getByLabelText('Expected guests'), '40');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    expect((await screen.findAllByText(/Name already used/)).length).toBeGreaterThan(0);
  });
});
