interface ProgressBarProps {
  label: string;
  value: number;
  status?: 'ok' | 'warning' | 'over';
}

/** Native <progress> with an accessible name; value is clamped to 0-100. */
export function ProgressBar({ label, value, status = 'ok' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return <progress className={status === 'ok' ? undefined : `is-${status}`} max={100} value={clamped} aria-label={label} aria-valuetext={`${Math.round(value)} percent`} />;
}
