import { LogOut, Sparkles } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function Layout() {
  const { session, signOut } = useAuth();
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label="Festiva AI home">
            <Sparkles size={22} aria-hidden="true" /> Festiva AI
          </Link>
          <nav aria-label="Main">
            {session ? (
              <>
                <NavLink to="/dashboard">My events</NavLink>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
                  <LogOut size={16} aria-hidden="true" /> Sign out
                </button>
              </>
            ) : (
              <Link to="/signin" className="btn btn-secondary btn-sm">Sign in</Link>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <p><strong>Festiva AI</strong>: Big celebrations. Thoughtful plans. Zero chaos.</p>
          <p className="small">
            Plans, budgets and ideas are AI-generated estimates, not quotes or verified prices. Vendor records are details you enter yourself; Festiva AI does not verify vendors.
          </p>
          <p className="small">
            Privacy: your events are stored in your account and visible only to you. Event details you ask the AI about are sent to Google’s Gemini API to produce answers; vendor contact details are never sent.
          </p>
        </div>
      </footer>
    </>
  );
}
