import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Notice } from './ui/Notice';
import { Loading } from './ui/Feedback';

/** Wraps pages that need a signed-in user. */
export function RequireAuth() {
  const { session, loading, configured } = useAuth();
  const location = useLocation();

  if (!configured) {
    return (
      <div className="container page">
        <Notice tone="danger" live>
          <p>Sign-in is not configured for this deployment. The site owner needs to set the Supabase environment variables.</p>
        </Notice>
      </div>
    );
  }
  if (loading) return <Loading label="Checking your session" />;
  if (!session) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
