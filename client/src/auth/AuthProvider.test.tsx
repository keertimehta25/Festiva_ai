// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

const mocks = vi.hoisted(() => {
  const state: { configured: boolean; authListener: ((event: string, session: unknown) => void) | null } = {
    configured: true,
    authListener: null,
  };
  const auth = {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };
  return { state, auth, unsubscribe: vi.fn(), configureApi: vi.fn() };
});

vi.mock('../lib/supabase', () => ({
  get isAuthConfigured() {
    return mocks.state.configured;
  },
  get supabase() {
    return mocks.state.configured ? { auth: mocks.auth } : null;
  },
}));
vi.mock('../lib/api', () => ({ configureApi: mocks.configureApi }));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p>{auth.loading ? 'loading' : 'ready'}</p>
      <p>{auth.session ? 'signed in' : 'signed out'}</p>
      <p>{auth.configured ? 'configured' : 'not configured'}</p>
      <button type="button" onClick={() => void auth.signIn('a@b.co', 'password1').then((e) => show(`signIn:${e}`))}>
        sign in
      </button>
      <button
        type="button"
        onClick={() => void auth.signUp('a@b.co', 'password1').then((r) => show(`signUp:${JSON.stringify(r)}`))}
      >
        sign up
      </button>
      <button type="button" onClick={() => void auth.signOut()}>
        sign out
      </button>
      <output id="result" />
    </div>
  );
}

function show(text: string) {
  const out = document.getElementById('result');
  if (out) out.textContent = text;
}

function renderProvider() {
  const queryClient = new QueryClient();
  const clear = vi.spyOn(queryClient, 'clear');
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { clear };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.configured = true;
  mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
  mocks.auth.onAuthStateChange.mockImplementation((listener: (event: string, session: unknown) => void) => {
    mocks.state.authListener = listener;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
  mocks.auth.signInWithPassword.mockResolvedValue({ error: null });
  mocks.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mocks.auth.signOut.mockResolvedValue({ error: null });
});

describe('AuthProvider', () => {
  it('reads the stored session once and then stops loading', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    renderProvider();

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('signed in')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('clears cached data when the user signs out', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    const { clear } = renderProvider();
    await screen.findByText('signed in');

    act(() => mocks.state.authListener?.('SIGNED_OUT', null));
    expect(await screen.findByText('signed out')).toBeInTheDocument();
    expect(clear).toHaveBeenCalled();
  });

  it('stops listening when it unmounts', async () => {
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await screen.findByText('ready');
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });

  it('signs in and reports an error message from the service', async () => {
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => expect(document.getElementById('result')).toHaveTextContent('signIn:null'));

    mocks.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login' } });
    await user.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => expect(document.getElementById('result')).toHaveTextContent('signIn:Invalid login'));
  });

  it('signs up and says when the email must be confirmed first', async () => {
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'sign up' }));
    await waitFor(() => expect(document.getElementById('result')).toHaveTextContent('"needsConfirmation":true'));

    mocks.auth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    await user.click(screen.getByRole('button', { name: 'sign up' }));
    await waitFor(() => expect(document.getElementById('result')).toHaveTextContent('"needsConfirmation":false'));

    mocks.auth.signUp.mockResolvedValue({ data: { session: null }, error: { message: 'Email taken' } });
    await user.click(screen.getByRole('button', { name: 'sign up' }));
    await waitFor(() => expect(document.getElementById('result')).toHaveTextContent('Email taken'));
  });

  it('signs out through the service', async () => {
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'sign out' }));
    expect(mocks.auth.signOut).toHaveBeenCalled();
  });

  it('gives the API client a token provider and a sign-out handler', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'abc' } } });
    renderProvider();
    await screen.findByText('signed in');

    const options = mocks.configureApi.mock.calls[0]?.[0] as {
      getToken: () => Promise<string | null>;
      onUnauthorized: () => void;
    };
    await expect(options.getToken()).resolves.toBe('abc');
    options.onUnauthorized();
    expect(mocks.auth.signOut).toHaveBeenCalled();
  });

  it('degrades gracefully when Supabase is not configured', async () => {
    mocks.state.configured = false;
    const user = userEvent.setup();
    renderProvider();

    expect(await screen.findByText('not configured')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => expect(document.getElementById('result')).toHaveTextContent('Sign-in is not configured.'));
    await user.click(screen.getByRole('button', { name: 'sign up' }));
    await waitFor(() => expect(document.getElementById('result')).toHaveTextContent('Sign-up is not configured.'));
    await user.click(screen.getByRole('button', { name: 'sign out' }));
    expect(mocks.auth.signOut).not.toHaveBeenCalled();

    const options = mocks.configureApi.mock.calls[0]?.[0] as { getToken: () => Promise<string | null> };
    await expect(options.getToken()).resolves.toBeNull();
  });

  it('refuses to be used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('useAuth must be used inside AuthProvider');
    spy.mockRestore();
  });
});
