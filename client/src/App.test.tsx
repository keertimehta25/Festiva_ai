// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from './test/render';
import { App } from './App';

interface FakeAuth {
  session: object | null;
  loading: boolean;
  configured: boolean;
}

const auth = vi.hoisted(() => {
  const state: FakeAuth = { session: null, loading: false, configured: true };
  return { state };
});

vi.mock('./auth/AuthProvider', () => ({
  useAuth: () => ({
    ...auth.state,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock('./lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/api')>();
  return { ...actual, api: { listEvents: vi.fn(async () => []), createEvent: vi.fn() } };
});

beforeEach(() => {
  auth.state = { session: null, loading: false, configured: true };
});

describe('App routing', () => {
  it('shows the landing page at the root', async () => {
    renderWithProviders(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toBeInTheDocument();
  });

  it('shows a friendly page for unknown addresses', async () => {
    renderWithProviders(<App />, '/no/such/page');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it('sends signed-out visitors from a private page to the sign-in page', async () => {
    renderWithProviders(<App />, '/dashboard');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('waits while the stored session is being read', async () => {
    auth.state = { session: null, loading: true, configured: true };
    renderWithProviders(<App />, '/dashboard');
    expect(await screen.findByText('Checking your session…')).toBeInTheDocument();
  });

  it('explains when sign-in is not configured on this deployment', async () => {
    auth.state = { session: null, loading: false, configured: false };
    renderWithProviders(<App />, '/dashboard');
    expect(await screen.findByText(/Sign-in is not configured for this deployment/)).toBeInTheDocument();
  });

  it('lets a signed-in user open private pages', async () => {
    auth.state = { session: { user: { id: 'u1' } }, loading: false, configured: true };
    renderWithProviders(<App />, '/events/new');
    expect(await screen.findByRole('heading', { name: 'Plan a new event' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign out/ })).toBeInTheDocument();
  });
});
