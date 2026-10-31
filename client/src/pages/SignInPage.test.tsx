// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { checkA11y } from '../test/a11y';
import { renderWithProviders } from '../test/render';

const auth = vi.hoisted(() => ({
  signIn: vi.fn(async () => null as string | null),
  signUp: vi.fn(async () => ({ error: null as string | null, needsConfirmation: true })),
}));
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ session: null, loading: false, configured: true, signOut: vi.fn(), ...auth }),
}));

const { default: SignInPage } = await import('./SignInPage');

describe('SignInPage', () => {
  it('validates email and password before calling the provider', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('valid email');

    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.clear(screen.getByLabelText('Password'));
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 8 characters');
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('shows the provider error when sign-in fails', async () => {
    auth.signIn.mockResolvedValueOnce('Invalid login credentials');
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);
    await user.type(screen.getByLabelText('Email'), 'a@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials');
  });

  it('switches to sign-up and tells the user to confirm their email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/Check your email for a confirmation link/)).toBeInTheDocument();
    expect(auth.signUp).toHaveBeenCalledWith('new@example.com', 'longenough1');
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderWithProviders(<SignInPage />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
