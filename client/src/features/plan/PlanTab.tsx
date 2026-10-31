import { CalendarPlus, RefreshCw, Sparkles, Wallet } from 'lucide-react';
import { useState } from 'react';
import type { Workspace } from '@shared/types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Notice } from '../../components/ui/Notice';
import { useToast } from '../../components/ui/Toasts';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { formatRupees } from '../../lib/format';
import {
  BudgetSection,
  ChecklistsSection,
  ConceptSection,
  IdeasSection,
  ScheduleAndRisksSection,
  TimelineSection,
  TipsSection,
} from './PlanSections';

export default function PlanTab({ workspace }: { workspace: Workspace }) {
  const { event } = workspace;
  const { plan } = event;
  const toast = useToast();
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  const generate = useWorkspaceMutation(event.id, () => api.generatePlan(event.id));
  const applyTasks = useWorkspaceMutation(event.id, () => api.applyPlanTasks(event.id));
  const applyBudget = useWorkspaceMutation(event.id, () => api.applyPlanBudget(event.id));

  function runGenerate() {
    setConfirmRegenerate(false);
    generate.mutate(undefined, {
      onSuccess: (result) => {
        setNotes(result.notes);
        toast.success('Your plan is ready');
      },
    });
  }

  if (!plan) {
    return (
      <div className="card stack max-w-760">
        <h2>Generate your personalised plan</h2>
        <p>
          The AI will use your event type, date, city, budget, guest count, food preference, setting and priorities to
          draft a concept, budget split, timeline, vendor checklist, ideas, day-of schedule and contingency plans. It
          usually takes under a minute.
        </p>
        <Notice tone="info">
          <p>
            Everything it produces is an AI-generated suggestion. Amounts are rough estimates, not quotes or verified
            prices, and no real vendors are named.
          </p>
        </Notice>
        {generate.error && <ErrorNotice error={generate.error} onRetry={runGenerate} />}
        <div>
          <button type="button" className="btn btn-primary" onClick={runGenerate} disabled={generate.isPending}>
            <Sparkles size={18} aria-hidden="true" /> {generate.isPending ? 'Planning your event…' : 'Generate AI plan'}
          </button>
        </div>
        {generate.isPending && (
          <p role="status" className="muted">
            Working on it. Please keep this page open.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <Notice tone="warning">
        <p>
          <strong>AI-generated plan.</strong> Generated with {plan.model}. Amounts are estimates with the assumptions
          listed below, not quotes or verified market prices. No vendor, availability or contact information is
          verified.
        </p>
      </Notice>
      {plan.budgetWarning && (
        <Notice tone="danger" live>
          <p>
            {plan.budgetWarning} (Estimates total {formatRupees(plan.estimatedTotal)}; your budget is{' '}
            {formatRupees(event.totalBudget)}.)
          </p>
        </Notice>
      )}
      {notes.length > 0 && (
        <Notice tone="info">
          <ul className="tight-list">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Notice>
      )}
      {plan.clarifyingQuestions.length > 0 && (
        <Notice tone="info">
          <p>
            <strong>The AI would like to know:</strong>
          </p>
          <ul className="tight-list">
            {plan.clarifyingQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="small">Update your event details or ask the Copilot, then regenerate if needed.</p>
        </Notice>
      )}

      <div className="card row-between">
        <div>
          <strong>Use this plan</strong>
          <div className="muted small">Nothing changes in your workspace until you choose.</div>
        </div>
        <div className="row-actions flex-wrap">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={applyBudget.isPending}
            onClick={() =>
              applyBudget.mutate(undefined, {
                onSuccess: () => toast.success('Budget split applied'),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            <Wallet size={16} aria-hidden="true" /> Apply budget split
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={applyTasks.isPending}
            onClick={() =>
              applyTasks.mutate(undefined, {
                onSuccess: ({ created, skipped }) =>
                  toast.success(
                    `Added ${created.length} task${created.length === 1 ? '' : 's'}${skipped > 0 ? `, skipped ${skipped} that already exist` : ''}`,
                  ),
                onError: (e) => toast.error(e.message),
              })
            }
          >
            <CalendarPlus size={16} aria-hidden="true" /> Add timeline to tasks
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={generate.isPending}
            onClick={() => setConfirmRegenerate(true)}
          >
            <RefreshCw size={16} aria-hidden="true" /> {generate.isPending ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      </div>
      {generate.error && <ErrorNotice error={generate.error} onRetry={runGenerate} />}

      <ConceptSection plan={plan} />
      <BudgetSection plan={plan} totalBudget={event.totalBudget} />
      <TimelineSection plan={plan} />
      <ChecklistsSection plan={plan} />
      <IdeasSection plan={plan} />
      <ScheduleAndRisksSection plan={plan} />
      <TipsSection plan={plan} />

      {confirmRegenerate && (
        <ConfirmDialog
          title="Replace this plan?"
          message="A new plan will replace the current one. Tasks and budget changes you already applied are kept."
          confirmLabel="Regenerate"
          onConfirm={runGenerate}
          onCancel={() => setConfirmRegenerate(false)}
        />
      )}
    </div>
  );
}
