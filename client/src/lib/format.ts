const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** ₹12,34,567 with Indian digit grouping. Negative amounts keep their sign. */
export const formatRupees = (amount: number): string => rupees.format(amount);

/** Short Indian-style date (22 Oct 2026) for a calendar date stored as YYYY-MM-DD. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'No date';
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

export function describeDaysUntil(days: number | null): string {
  if (days === null) return 'Date not set';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

/** Parses a rupee amount typed by a user ("1,50,000" or "150000"); returns NaN when it is not a whole number. */
export function parseWholeNumber(input: string): number {
  const cleaned = input.replace(/[,\s₹]/g, '');
  return /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}
