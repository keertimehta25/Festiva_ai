import { AlertCircle } from 'lucide-react';
import { cloneElement, useId, type ReactElement } from 'react';

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string;
  optional?: boolean;
  /** A single form control; it receives the id and the aria attributes automatically. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>;
}

/** Label + control + hint + error, wired together so screen readers announce all of them. */
export function Field({ label, error, hint, optional = false, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && (
        <span id={hintId} className="hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field-error">
          <AlertCircle size={16} aria-hidden="true" className="icon-inline" /> {error}
        </span>
      )}
    </div>
  );
}
