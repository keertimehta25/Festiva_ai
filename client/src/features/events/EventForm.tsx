import { useState, type SyntheticEvent } from 'react';
import { analyzeEventInput } from '@shared/eventChecks';
import { eventCreateSchema, type EventInput } from '@shared/schemas';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Notice } from '../../components/ui/Notice';
import { getToday } from '../../hooks/useToday';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '../../lib/formErrors';
import { INITIAL_EVENT_FORM, toEventCandidate, type SetEventField } from './eventFormState';
import { BasicsSection, ScaleSection, StyleSection } from './EventFormSections';

interface EventFormProps {
  onSubmit: (input: EventInput) => Promise<void>;
  submitLabel: string;
  busy: boolean;
}

/** Shown at the top after a failed submit; focused so keyboard and screen-reader users land on it. */
function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const count = Object.keys(errors).length;
  return (
    <div id="form-errors" tabIndex={-1} className="form-summary">
      <Notice tone="danger" live>
        <p>
          <strong>Please fix {count === 1 ? '1 field' : `${count} fields`} below.</strong>{' '}
          {Object.values(errors).join(' · ')}
        </p>
      </Notice>
    </div>
  );
}

export function EventForm({ onSubmit, submitLabel, busy }: EventFormProps) {
  const [form, setForm] = useState(INITIAL_EVENT_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<unknown>(null);

  const set: SetEventField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const schema = eventCreateSchema(getToday());
  const preview = schema.safeParse(toEventCandidate(form));
  const notes = preview.success ? analyzeEventInput(preview.data) : [];
  const errorCount = Object.keys(errors).length;

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!preview.success) {
      setErrors(fieldErrorsFromZod(preview.error));
      document.getElementById('form-errors')?.focus();
      return;
    }
    setErrors({});
    try {
      await onSubmit(preview.data);
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setSubmitError(error);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="stack">
      {errorCount > 0 && <ErrorSummary errors={errors} />}
      {submitError !== null && errorCount === 0 && <ErrorNotice error={submitError} />}

      <BasicsSection form={form} errors={errors} set={set} />
      <ScaleSection form={form} errors={errors} set={set} notes={notes} />
      <StyleSection form={form} errors={errors} set={set} />

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
