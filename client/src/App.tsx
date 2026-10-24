import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { Loading } from './components/ui/Feedback';
import { LandingPage } from './pages/LandingPage';

// Signed-in screens are loaded on demand so the landing page stays small.
const SignInPage = lazy(() => import('./pages/SignInPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const NewEventPage = lazy(() => import('./pages/NewEventPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="signin" element={<SignInPage />} />
          <Route element={<RequireAuth />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="events/new" element={<NewEventPage />} />
            <Route path="events/:eventId/*" element={<WorkspacePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
