import { useState } from 'react';
import { applyReallocation } from '@shared/calc/budget';
import { BUDGET_CATEGORY_LABELS, TASK_CATEGORY_LABELS } from '@shared/constants';
import type { AiProposal } from '@shared/schemas';
import type { EventRecord } from '@shared/types';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { formatDate, formatRupees } from '../../lib/format';

type Status = 'pending' | 'applied' | 'dismissed';

/** A change suggested by the copilot. Nothing is saved until the user presses Apply. */
export function ProposalCard({ proposal, event }: { proposal: AiProposal; event: EventRecord }) {
  const [status, setStatus] = useState<Status>('pending');
  const [error, setError] = useState<string | null>(null);

  const apply = useWorkspaceMutation(event.id, async () => {
    if (proposal.type === 'add_task') {
      const { task } = proposal;
      return api.createTask(event.id, { title: task.title, description: task.description, category: task.category, priority: task.priority, dueDate: task.dueDate });
    }
    // Recomputed from the current event so a stale suggestion cannot overwrite newer edits.
    return api.updateEvent(event.id, { allocations: applyReallocation(event.allocations, { from: proposal.fromCategory, to: proposal.toCategory, amount: proposal.amount }) });
  });

  function handleApply() {
    setError(null);
    apply.mutate(undefined, { onSuccess: () => setStatus('applied'), onError: (e) => setError(e instanceof Error ? e.message : 'Could not apply this change') });
  }

  return (
    <div className="card" style={{ background: 'var(--surface-muted)' }}>
      <p className="eyebrow" style={{ marginBottom: 4 }}>Suggested change: not applied yet</p>
      <p style={{ marginBottom: 4 }}><strong>{proposal.summary}</strong></p>
      <p className="small muted">
        {proposal.type === 'add_task'
          ? `Add task “${proposal.task.title}” (${TASK_CATEGORY_LABELS[proposal.task.category]}, due ${formatDate(proposal.task.dueDate)})`
          : `Move ${formatRupees(proposal.amount)} from ${BUDGET_CATEGORY_LABELS[proposal.fromCategory]} to ${BUDGET_CATEGORY_LABELS[proposal.toCategory]}`}
      </p>
      {error && <p className="field-error" role="alert">{error}</p>}
      {status === 'pending' && (
        <div className="row-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleApply} disabled={apply.isPending}>{apply.isPending ? 'Applying…' : 'Apply this change'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus('dismissed')}>Dismiss</button>
        </div>
      )}
      {status === 'applied' && <span className="badge badge-success" role="status">Applied</span>}
      {status === 'dismissed' && <span className="badge badge-neutral" role="status">Dismissed</span>}
    </div>
  );
}
