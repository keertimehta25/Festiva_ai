import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { summarizeBudget } from '@shared/calc/budget';
import { daysUntilEvent, isOverdue, taskProgress, upcomingTasks } from '@shared/calc/tasks';
import { followUpsDue, summarizeVendors } from '@shared/calc/vendors';
import { FOOD_PREFERENCE_LABELS, PLANNING_PRIORITY_LABELS, VENUE_SETTING_LABELS } from '@shared/constants';
import type { Workspace } from '@shared/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Notice } from '../../components/ui/Notice';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useToast } from '../../components/ui/Toasts';
import { queryKeys } from '../../hooks/useEvents';
import { getToday } from '../../hooks/useToday';
import { api } from '../../lib/api';
import { describeDaysUntil, formatDate, formatRupees } from '../../lib/format';
import { EditEventDialog } from './EditEventDialog';

export function OverviewTab({ workspace }: { workspace: Workspace }) {
  const { event, tasks, expenses, vendors } = workspace;
  const today = getToday();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const budget = summarizeBudget(event.totalBudget, event.allocations, expenses);
  const progress = taskProgress(tasks);
  const vendorTotals = summarizeVendors(vendors);
  const overdue = tasks.filter((task) => isOverdue(task, today));
  const soon = upcomingTasks(tasks, today, 14).slice(0, 5);
  const followUps = followUpsDue(vendors, today);
  const days = daysUntilEvent(event.eventDate, today);

  const remove = useMutation({
    mutationFn: () => api.deleteEvent(event.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.events });
      toast.success('Event deleted');
      void navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Could not delete the event');
      setDeleting(false);
    },
  });

  return (
    <div className="stack">
      {days !== null && days < 0 && (
        <Notice tone="info">
          <p>This event date has passed. You can still review its budget and records.</p>
        </Notice>
      )}
      {event.eventDate === null && (
        <Notice tone="warning">
          <p>No event date yet. Add one with “Edit details” to get due dates on your tasks.</p>
        </Notice>
      )}
      {budget.overBudget && (
        <Notice tone="danger" live>
          <p>
            <strong>You are over budget</strong> by {formatRupees(-budget.remaining)}. Review the Budget tab for
            suggestions.
          </p>
        </Notice>
      )}

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Time to go</div>
          <div className="stat-value">{describeDaysUntil(days)}</div>
          <div className="stat-note">{formatDate(event.eventDate)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Tasks completed</div>
          <div className="stat-value">{progress.percent}%</div>
          <div className="stat-note">
            {progress.completed} of {progress.total} done{overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Budget remaining</div>
          <div className="stat-value">{formatRupees(budget.remaining)}</div>
          <div className="stat-note">
            {budget.percentConsumed}% of {formatRupees(event.totalBudget)} spent
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Vendors booked</div>
          <div className="stat-value">{vendorTotals.bookedCount}</div>
          <div className="stat-note">{formatRupees(vendorTotals.pendingTotal)} still to pay</div>
        </div>
      </div>
      <ProgressBar label="Overall task progress" value={progress.percent} />

      <div className="two-col">
        <section className="card" aria-labelledby="soon-heading">
          <div className="card-header">
            <h2 id="soon-heading">Coming up (next 14 days)</h2>
            <Link to={`/events/${event.id}/tasks`} className="btn btn-ghost btn-sm">
              All tasks
            </Link>
          </div>
          {overdue.length > 0 && (
            <Notice tone="danger">
              <p>
                {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}. Check the Tasks tab.
              </p>
            </Notice>
          )}
          {soon.length === 0 ? (
            <p className="muted">Nothing due in the next two weeks.</p>
          ) : (
            <ul className="list-plain">
              {soon.map((task) => (
                <li key={task.id} className="row-between">
                  <span>{task.title}</span>
                  <span className="badge badge-neutral">{formatDate(task.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
          {followUps.length > 0 && (
            <Notice tone="warning">
              <p>Vendor follow-ups due: {followUps.map((vendor) => vendor.name).join(', ')}.</p>
            </Notice>
          )}
        </section>

        <section className="card" aria-labelledby="details-heading">
          <div className="card-header">
            <h2 id="details-heading">Event details</h2>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={16} aria-hidden="true" /> Edit details
            </button>
          </div>
          <dl className="details">
            <dt>Guests</dt>
            <dd>{event.guestCount}</dd>
            <dt>Duration</dt>
            <dd>{event.durationHours} hours</dd>
            <dt>Food</dt>
            <dd>{FOOD_PREFERENCE_LABELS[event.foodPreference]}</dd>
            <dt>Setting</dt>
            <dd>{VENUE_SETTING_LABELS[event.venueSetting]}</dd>
            {event.venuePreference && (
              <>
                <dt>Venue</dt>
                <dd>{event.venuePreference}</dd>
              </>
            )}
            {event.theme && (
              <>
                <dt>Theme</dt>
                <dd>{event.theme}</dd>
              </>
            )}
            {event.colors && (
              <>
                <dt>Colours</dt>
                <dd>{event.colors}</dd>
              </>
            )}
            {event.priorities.length > 0 && (
              <>
                <dt>Priorities</dt>
                <dd>{event.priorities.map((p) => PLANNING_PRIORITY_LABELS[p]).join(', ')}</dd>
              </>
            )}
            {event.culturalNotes && (
              <>
                <dt>Notes</dt>
                <dd>{event.culturalNotes}</dd>
              </>
            )}
          </dl>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleting(true)}>
            <Trash2 size={16} aria-hidden="true" /> Delete this event
          </button>
        </section>
      </div>

      {editing && <EditEventDialog event={event} onClose={() => setEditing(false)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete this event?"
          message={`“${event.name}” and all of its tasks, expenses, vendors and plan will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete event"
          busy={remove.isPending}
          onConfirm={() => remove.mutate()}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
