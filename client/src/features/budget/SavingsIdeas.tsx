import { useMutation } from '@tanstack/react-query';
import { Lightbulb, Sparkles } from 'lucide-react';
import { BUDGET_CATEGORY_LABELS } from '@shared/constants';
import type { AiSavings } from '@shared/schemas';
import { ErrorNotice } from '../../components/ui/Feedback';
import { api } from '../../lib/api';

/** Asks the AI for cost-saving ideas based on the event's numbers and lists what comes back. */
export function SavingsIdeas({ eventId }: { eventId: string }) {
  const savings = useMutation<AiSavings>({ mutationFn: () => api.suggestSavings(eventId) });
  const ask = () => {
    savings.mutate();
  };

  return (
    <section className="card" aria-labelledby="savings-heading">
      <div className="card-header">
        <h2 id="savings-heading">AI cost-saving ideas</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={ask} disabled={savings.isPending}>
          <Sparkles size={16} aria-hidden="true" />{' '}
          {savings.isPending ? 'Thinking…' : savings.data ? 'Refresh ideas' : 'Get ideas'}
        </button>
      </div>
      {savings.error && <ErrorNotice error={savings.error} onRetry={ask} />}
      {savings.data ? (
        <>
          <p className="muted small">
            AI-generated suggestions based on your numbers. Check any saving with your vendors before relying on it.
          </p>
          <ul className="list-plain">
            {savings.data.ideas.map((idea) => (
              <li key={idea.title}>
                <strong>
                  <Lightbulb size={16} aria-hidden="true" className="icon-inline" /> {idea.title}
                </strong>{' '}
                <span className="badge badge-neutral">{BUDGET_CATEGORY_LABELS[idea.category]}</span>
                <p className="idea-detail">{idea.detail}</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        !savings.error && (
          <p className="muted">
            Ask the AI for specific ways to save, based on where you are close to or over your limits.
          </p>
        )
      )}
    </section>
  );
}
