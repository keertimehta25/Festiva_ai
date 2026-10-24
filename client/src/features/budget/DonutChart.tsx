import { BUDGET_CATEGORY_LABELS, type BudgetCategory } from '@shared/constants';
import { formatRupees } from '../../lib/format';

/** Warm, restrained palette; the legend and the table beside the chart carry the actual meaning. */
const COLORS: Record<BudgetCategory, string> = {
  venue: '#5b2a4e', catering: '#e8a33d', decoration: '#2f5d50', photography: '#9b5c8f', entertainment: '#c46a2f',
  attire: '#6f9b8a', invitations: '#b58ab0', transportation: '#8a6d3b', accommodation: '#3f7f9a', miscellaneous: '#9a8f9c',
};

export interface Slice { category: BudgetCategory; amount: number }

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Donut of the allocation split. Decorative for assistive tech: the table next to it holds the same data. */
export function DonutChart({ slices, total }: { slices: Slice[]; total: number }) {
  const visible = slices.filter((slice) => slice.amount > 0);
  const sum = visible.reduce((acc, slice) => acc + slice.amount, 0);
  let offset = 0;

  return (
    <figure style={{ margin: 0 }}>
      <svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label={`Budget split across ${visible.length} categories. Full details are in the table.`}>
        <circle cx="95" cy="95" r={RADIUS} fill="none" stroke="#f5eee5" strokeWidth="28" />
        {sum > 0 && visible.map((slice) => {
          const length = (slice.amount / sum) * CIRCUMFERENCE;
          const dash = `${length} ${CIRCUMFERENCE - length}`;
          const circle = (
            <circle key={slice.category} cx="95" cy="95" r={RADIUS} fill="none" stroke={COLORS[slice.category]} strokeWidth="28"
              strokeDasharray={dash} strokeDashoffset={-offset} transform="rotate(-90 95 95)">
              <title>{`${BUDGET_CATEGORY_LABELS[slice.category]}: ${formatRupees(slice.amount)}`}</title>
            </circle>
          );
          offset += length;
          return circle;
        })}
        <text x="95" y="90" textAnchor="middle" fontSize="12" fill="#6b5e6e">Total budget</text>
        <text x="95" y="112" textAnchor="middle" fontSize="16" fontWeight="700" fill="#2a1f2d">{formatRupees(total)}</text>
      </svg>
    </figure>
  );
}


export function categoryColor(category: BudgetCategory): string {
  return COLORS[category];
}
