import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, PartyPopper, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EVENT_TYPE_LABELS } from '@shared/constants';
import type { EventWithSummary } from '@shared/types';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState, ErrorNotice, Loading } from '../components/ui/Feedback';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useToast } from '../components/ui/Toasts';
import { queryKeys, useEventList } from '../hooks/useEvents';
import { api } from '../lib/api';
import { describeDaysUntil, formatDate, formatRupees } from '../lib/format';

function EventCard({ item, onDelete }: { item: EventWithSummary; onDelete: () => void }) {
  const { event, summary } = item;
  return (
    <article className="card event-card">
      <div className="row-between">
        <h2><Link to={`/events/${event.id}`}>{event.name}</Link></h2>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onDelete} aria-label={`Delete ${event.name}`}>
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="event-meta">
        <span className="badge">{EVENT_TYPE_LABELS[event.eventType]}</span>
        {event.isSample && <span className="badge badge-warning">Sample data</span>}
        <span className="badge badge-neutral"><CalendarDays size={14} aria-hidden="true" /> {formatDate(event.eventDate)}</span>
        <span className="badge badge-neutral"><Users size={14} aria-hidden="true" /> {event.guestCount} guests</span>
      </div>
      <p className="muted small">{describeDaysUntil(summary.daysToEvent)}{event.city ? ` · ${event.city}` : ''}</p>
      <div>
        <div className="meter-row"><span>Tasks done</span><span>{summary.taskProgressPercent}%</span></div>
        <ProgressBar label={`Task progress for ${event.name}`} value={summary.taskProgressPercent} />
      </div>
      <div>
        <div className="meter-row"><span>Budget spent</span><span>{formatRupees(summary.totalActual)} of {formatRupees(event.totalBudget)}</span></div>
        <ProgressBar label={`Budget used for ${event.name}`} value={summary.percentConsumed} status={summary.percentConsumed > 100 ? 'over' : summary.percentConsumed >= 85 ? 'warning' : 'ok'} />
      </div>
      <Link to={`/events/${event.id}`} className="btn btn-secondary btn-sm" aria-label={`Open ${event.name}`}>Open workspace</Link>
    </article>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useEventList();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<EventWithSummary | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteEvent(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.events });
      toast.success('Event deleted');
      setPendingDelete(null);
    },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Could not delete the event'); setPendingDelete(null); },
  });

  const sample = useMutation({
    mutationFn: api.createSample,
    onSuccess: async ({ event }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.events });
      navigate(`/events/${event.id}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not load the sample'),
  });

  return (
    <div className="container page">
      <div className="page-header">
        <h1>My events</h1>
        <Link to="/events/new" className="btn btn-primary"><Plus size={18} aria-hidden="true" /> New event</Link>
      </div>

      {isLoading && <Loading label="Loading your events" />}
      {error && <ErrorNotice error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <div className="card">
          <EmptyState
            title="No events yet"
            action={
              <div className="hero-actions" style={{ justifyContent: 'center' }}>
                <Link to="/events/new" className="btn btn-primary">Plan My Event</Link>
                <button type="button" className="btn btn-secondary" onClick={() => sample.mutate()} disabled={sample.isPending}>
                  <PartyPopper size={18} aria-hidden="true" /> {sample.isPending ? 'Loading…' : 'Explore a sample wedding'}
                </button>
              </div>
            }
          >
            Create your first event, or open a clearly labelled sample wedding to see how everything works.
          </EmptyState>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <div className="event-grid">
            {data.map((item) => <EventCard key={item.event.id} item={item} onDelete={() => setPendingDelete(item)} />)}
          </div>
          {!data.some((item) => item.event.isSample) && (
            <p style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => sample.mutate()} disabled={sample.isPending}>
                <PartyPopper size={16} aria-hidden="true" /> Add a sample wedding to explore
              </button>
            </p>
          )}
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this event?"
          message={`“${pendingDelete.event.name}” and all of its tasks, expenses, vendors and plan will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete event"
          busy={remove.isPending}
          onConfirm={() => remove.mutate(pendingDelete.event.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
