import { lazy, Suspense } from 'react';
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EVENT_TYPE_LABELS } from '@shared/constants';
import { ErrorNotice, Loading } from '../components/ui/Feedback';
import { useWorkspace } from '../hooks/useEvents';
import { ApiError } from '../lib/api';
import { formatDate } from '../lib/format';
import { OverviewTab } from '../features/overview/OverviewTab';
import NotFoundPage from './NotFoundPage';

const PlanTab = lazy(() => import('../features/plan/PlanTab'));
const BudgetTab = lazy(() => import('../features/budget/BudgetTab'));
const TasksTab = lazy(() => import('../features/tasks/TasksTab'));
const VendorsTab = lazy(() => import('../features/vendors/VendorsTab'));
const CopilotTab = lazy(() => import('../features/copilot/CopilotTab'));

// Paths are relative to /events/:eventId and are made absolute below: relative links inside a
// splat route would otherwise stack up (/plan/plan/budget) once a tab is open.
const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'plan', label: 'AI plan' },
  { to: 'budget', label: 'Budget' },
  { to: 'tasks', label: 'Tasks' },
  { to: 'vendors', label: 'Vendors' },
  { to: 'copilot', label: 'Copilot' },
];

export default function WorkspacePage() {
  const { eventId = '' } = useParams();
  const { data, isLoading, error, refetch } = useWorkspace(eventId);

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;

  return (
    <div className="container page">
      <p><Link to="/dashboard"><ArrowLeft size={16} aria-hidden="true" className="icon-inline" /> All events</Link></p>
      {isLoading && <Loading label="Loading your event" />}
      {error && <ErrorNotice error={error} onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="page-header">
            <div>
              <h1>{data.event.name}</h1>
              <p className="muted" style={{ margin: 0 }}>
                {EVENT_TYPE_LABELS[data.event.eventType]} · {formatDate(data.event.eventDate)}{data.event.dateIsApproximate ? ' (approximate)' : ''}
                {data.event.city ? ` · ${data.event.city}` : ''}
                {data.event.isSample ? ' · Sample data' : ''}
              </p>
            </div>
          </div>
          <nav aria-label="Event sections" className="tabs">
            {TABS.map((tab) => <NavLink key={tab.label} to={`/events/${eventId}${tab.to ? `/${tab.to}` : ''}`} end={tab.end}>{tab.label}</NavLink>)}
          </nav>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route index element={<OverviewTab workspace={data} />} />
              <Route path="plan" element={<PlanTab workspace={data} />} />
              <Route path="budget" element={<BudgetTab workspace={data} />} />
              <Route path="tasks" element={<TasksTab workspace={data} />} />
              <Route path="vendors" element={<VendorsTab workspace={data} />} />
              <Route path="copilot" element={<CopilotTab workspace={data} />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </>
      )}
    </div>
  );
}
