import type { HTMLInputTypeAttribute, ReactNode, SyntheticEvent } from 'react';
import { ErrorNotice } from './Feedback';
import { Field } from './Field';
import { Modal } from './Modal';

interface BaseFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string;
  optional?: boolean;
}

interface TextFieldProps extends BaseFieldProps {
  maxLength?: number;
  type?: HTMLInputTypeAttribute;
  /** Amounts are typed as text so the user can clear the box; the keyboard still shows digits. */
  numeric?: boolean;
  autoComplete?: string;
  /** Earliest allowed value (used by date inputs). */
  min?: string;
}

export function TextField({ onChange, value, maxLength, type, numeric, autoComplete, min, ...field }: TextFieldProps) {
  return (
    <Field {...field}>
      <input
        className="input"
        type={type}
        inputMode={numeric ? 'numeric' : undefined}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        min={min}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </Field>
  );
}

export function TextAreaField({ onChange, value, maxLength, ...field }: BaseFieldProps & { maxLength: number }) {
  return (
    <Field {...field}>
      <textarea
        className="textarea"
        value={value}
        maxLength={maxLength}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </Field>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

/** Builds select options from a list of values and a label lookup, e.g. a constants array and its labels. */
export function optionsFrom<T extends string>(values: readonly T[], labels: Record<T, string>): SelectOption[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

export function SelectField({ onChange, value, options, ...field }: BaseFieldProps & { options: SelectOption[] }) {
  return (
    <Field {...field}>
      <select
        className="select"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface FormDialogProps {
  title: string;
  onClose: () => void;
  onSubmit: () => Promise<void> | void;
  /** Error from the last save attempt, shown above the form. */
  failure: unknown;
  pending: boolean;
  submitLabel: string;
  /** Extra reasons to block saving (the button is always disabled while a save is running). */
  submitDisabled?: boolean;
  children: ReactNode;
}

/** The modal, form element, error banner and Cancel / Save buttons that every edit dialog shares. */
export function FormDialog(props: FormDialogProps) {
  const { title, onClose, onSubmit, failure, pending, submitLabel, submitDisabled = false, children } = props;
  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    void onSubmit();
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {failure !== null && <ErrorNotice error={failure} />}
        {children}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || submitDisabled}>
            {pending ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
