import {
  applyReallocation,
  suggestReallocations,
  type BudgetSummary,
  type ReallocationSuggestion,
} from '@shared/calc/budget';
import { BUDGET_CATEGORY_LABELS } from '@shared/constants';
import type { EventRecord } from '@shared/types';
import { useToast } from '../../components/ui/Toasts';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { formatRupees } from '../../lib/format';

const sourceLabel = (from: ReallocationSuggestion['from']) =>
  from === 'unallocated' ? 'unallocated funds' : BUDGET_CATEGORY_LABELS[from];

interface ReallocationSuggestionsProps {
  event: EventRecord;
  budget: BudgetSummary;
}

/** Suggested moves between categories, calculated from the user's own numbers. */
export function ReallocationSuggestions({ event, budget }: ReallocationSuggestionsProps) {
  const toast = useToast();
  const suggestions = suggestReallocations(budget);
  const reallocate = useWorkspaceMutation(event.id, (move: ReallocationSuggestion) =>
    api.updateEvent(event.id, { allocations: applyReallocation(event.allocations, move) }),
  );
  if (suggestions.length === 0) return null;

  const apply = (move: ReallocationSuggestion) => {
    reallocate.mutate(move, {
      onSuccess: () => toast.success('Budget updated'),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <section className="card" aria-labelledby="realloc-heading">
      <h2 id="realloc-heading">Reallocation suggestions</h2>
      <p className="muted small">
        Calculated from your own numbers. Each move only uses money not already spent or estimated elsewhere.
      </p>
      <ul className="list-plain">
        {suggestions.map((move) => (
          <li key={`${move.from}-${move.to}`} className="row-between">
            <span>
              Move {formatRupees(move.amount)} from {sourceLabel(move.from)} to {BUDGET_CATEGORY_LABELS[move.to]}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={reallocate.isPending}
              onClick={() => {
                apply(move);
              }}
            >
              Apply
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
