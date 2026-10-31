// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { checkA11y } from '../../test/a11y';
import { ConfirmDialog } from './ConfirmDialog';
import { Field } from './Field';

describe('ConfirmDialog', () => {
  const setup = (busy = false) => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const view = render(
      <ConfirmDialog
        title="Delete this event?"
        message="This cannot be undone."
        confirmLabel="Delete event"
        busy={busy}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel, ...view };
  };

  it('is a labelled modal dialog with accessible controls', async () => {
    const { container } = setup();
    const dialog = screen.getByRole('dialog', { name: 'Delete this event?' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('only confirms when the destructive button is pressed', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete event' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes through the close button and the Escape key (cancel event)', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    screen.getByRole('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('disables the confirm button while the request is running', () => {
    setup(true);
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
  });
});

describe('Field', () => {
  it('links label, hint and error to the control for screen readers', () => {
    render(
      <Field label="Guests" hint="Whole number" error="Enter a number">
        <input className="input" />
      </Field>,
    );
    const input = screen.getByLabelText('Guests');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Whole number Enter a number');
  });

  it('marks optional fields and has no invalid state without an error', () => {
    render(
      <Field label="City" optional>
        <input className="input" />
      </Field>,
    );
    expect(screen.getByLabelText(/City/)).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });
});
