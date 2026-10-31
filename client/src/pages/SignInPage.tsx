import { useState, type SyntheticEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Field } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';

export default function SignInPage() {
  const { session, configured, signIn, signUp } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  if (session) return <Navigate to={destination} replace />;

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    if (mode === 'signin') {
      setError(await signIn(email, password));
    } else {
      const result = await signUp(email, password);
      setError(result.error);
      if (!result.error && result.needsConfirmation) setInfo('Check your email for a confirmation link, then sign in.');
    }
    setBusy(false);
  }

  return (
    <div className="container page auth-page">
      <div className="card">
        <h1>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">Your events are private to your account.</p>
        {!configured && (
          <Notice tone="danger" live>
            <p>Sign-in is not configured for this deployment.</p>
          </Notice>
        )}
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          {error && (
            <Notice tone="danger" live>
              <p>{error}</p>
            </Notice>
          )}
          {info && (
            <Notice tone="success" live>
              <p>{info}</p>
            </Notice>
          )}
          <Field label="Email">
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button type="submit" className="btn btn-primary w-full" disabled={busy || !configured}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="mt-md">
          {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setInfo(null);
            }}
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in instead'}
          </button>
        </p>
      </div>
    </div>
  );
}
