import { useState, type SyntheticEvent } from 'react';
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  FOOD_PREFERENCE_LABELS,
  FOOD_PREFERENCES,
  PLANNING_PRIORITIES,
  PLANNING_PRIORITY_LABELS,
  VENUE_SETTING_LABELS,
  VENUE_SETTINGS,
  type PlanningPriority,
} from '@shared/constants';
import { eventCreateSchema, type EventInput } from '@shared/schemas';
import { analyzeEventInput } from '@shared/eventChecks';
import { Field } from '../../components/ui/Field';
import { Notice } from '../../components/ui/Notice';
import { getToday } from '../../hooks/useToday';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '../../lib/formErrors';
import { parseWholeNumber } from '../../lib/format';
import { ErrorNotice } from '../../components/ui/Feedback';

interface EventFormProps {
  onSubmit: (input: EventInput) => Promise<void>;
  submitLabel: string;
  busy: boolean;
}

interface FormState {
  eventType: string;
  name: string;
  eventDate: string;
  dateIsApproximate: boolean;
  city: string;
  venuePreference: string;
  totalBudget: string;
  guestCount: string;
  durationHours: string;
  theme: string;
  colors: string;
  foodPreference: string;
  venueSetting: string;
  culturalNotes: string;
  priorities: PlanningPriority[];
}

const INITIAL: FormState = {
  eventType: 'wedding',
  name: '',
  eventDate: '',
  dateIsApproximate: false,
  city: '',
  venuePreference: '',
  totalBudget: '',
  guestCount: '',
  durationHours: '4',
  theme: '',
  colors: '',
  foodPreference: 'mixed',
  venueSetting: 'either',
  culturalNotes: '',
  priorities: [],
};

/** Empty or non-numeric text becomes NaN so the schema reports "enter a valid number". */
const toNumber = (value: string): number => (value.trim() === '' ? Number.NaN : parseWholeNumber(value));

export function EventForm({ onSubmit, submitLabel, busy }: EventFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<unknown>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const candidate = {
    name: form.name,
    eventType: form.eventType,
    eventDate: form.eventDate === '' ? null : form.eventDate,
    dateIsApproximate: form.dateIsApproximate,
    city: form.city,
    venuePreference: form.venuePreference,
    totalBudget: toNumber(form.totalBudget),
    guestCount: toNumber(form.guestCount),
    durationHours: toNumber(form.durationHours),
    theme: form.theme,
    colors: form.colors,
    foodPreference: form.foodPreference,
    venueSetting: form.venueSetting,
    culturalNotes: form.culturalNotes,
    priorities: form.priorities,
  };
  const preview = eventCreateSchema(getToday()).safeParse(candidate);
  const heads = preview.success ? analyzeEventInput(preview.data) : [];

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setSubmitError(null);
    const parsed = eventCreateSchema(getToday()).safeParse(candidate);
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error));
      document.getElementById('form-errors')?.focus();
      return;
    }
    setErrors({});
    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setSubmitError(error);
    }
  }

  const togglePriority = (priority: PlanningPriority) =>
    set(
      'priorities',
      form.priorities.includes(priority)
        ? form.priorities.filter((p) => p !== priority)
        : [...form.priorities, priority],
    );

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="stack">
      {errorCount > 0 && (
        <div id="form-errors" tabIndex={-1} className="form-summary">
          <Notice tone="danger" live>
            <p>
              <strong>Please fix {errorCount === 1 ? '1 field' : `${errorCount} fields`} below.</strong>{' '}
              {Object.values(errors).join(' · ')}
            </p>
          </Notice>
        </div>
      )}
      {submitError !== null && errorCount === 0 && <ErrorNotice error={submitError} />}

      <section className="card" aria-labelledby="basics-heading">
        <h2 id="basics-heading">The basics</h2>
        <fieldset className="fieldset">
          <legend>What are you celebrating?</legend>
          <div className="option-grid">
            {EVENT_TYPES.map((type) => (
              <label key={type} className="option">
                <input
                  type="radio"
                  name="eventType"
                  value={type}
                  checked={form.eventType === type}
                  onChange={() => set('eventType', type)}
                />
                {EVENT_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
          {errors.eventType && <p className="field-error">{errors.eventType}</p>}
        </fieldset>
        <div className="form-grid">
          <Field label="Event name" error={errors.name}>
            <input
              className="input"
              value={form.name}
              maxLength={120}
              onChange={(e) => set('name', e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Event date" optional error={errors.eventDate} hint="Leave empty if you have not decided yet.">
            <input
              className="input"
              type="date"
              value={form.eventDate}
              min={getToday()}
              onChange={(e) => set('eventDate', e.target.value)}
            />
          </Field>
          <Field label="City" optional error={errors.city}>
            <input
              className="input"
              value={form.city}
              maxLength={80}
              onChange={(e) => set('city', e.target.value)}
              autoComplete="address-level2"
            />
          </Field>
          <Field
            label="Venue preference"
            optional
            error={errors.venuePreference}
            hint="For example: banquet hall, lawn, home, community ground."
          >
            <input
              className="input"
              value={form.venuePreference}
              maxLength={200}
              onChange={(e) => set('venuePreference', e.target.value)}
            />
          </Field>
        </div>
        <label className="option w-fit">
          <input
            type="checkbox"
            checked={form.dateIsApproximate}
            onChange={(e) => set('dateIsApproximate', e.target.checked)}
          />
          The date is approximate
        </label>
      </section>

      <section className="card" aria-labelledby="scale-heading">
        <h2 id="scale-heading">Budget and guests</h2>
        <div className="form-grid">
          <Field
            label="Estimated budget (₹)"
            error={errors.totalBudget}
            hint="Whole rupees, for example 800000 or 8,00,000."
          >
            <input
              className="input"
              inputMode="numeric"
              value={form.totalBudget}
              onChange={(e) => set('totalBudget', e.target.value)}
            />
          </Field>
          <Field label="Expected guests" error={errors.guestCount}>
            <input
              className="input"
              inputMode="numeric"
              value={form.guestCount}
              onChange={(e) => set('guestCount', e.target.value)}
            />
          </Field>
          <Field label="Duration (hours)" optional error={errors.durationHours}>
            <input
              className="input"
              inputMode="numeric"
              value={form.durationHours}
              onChange={(e) => set('durationHours', e.target.value)}
            />
          </Field>
        </div>
        {heads.length > 0 && (
          <Notice tone="warning" live>
            <ul className="tight-list">
              {heads.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>
        )}
      </section>

      <section className="card" aria-labelledby="style-heading">
        <h2 id="style-heading">Style and preferences</h2>
        <div className="form-grid">
          <Field label="Theme or style" optional error={errors.theme}>
            <input
              className="input"
              value={form.theme}
              maxLength={200}
              onChange={(e) => set('theme', e.target.value)}
            />
          </Field>
          <Field label="Preferred colours" optional error={errors.colors}>
            <input
              className="input"
              value={form.colors}
              maxLength={120}
              onChange={(e) => set('colors', e.target.value)}
            />
          </Field>
          <Field label="Food preference" error={errors.foodPreference}>
            <select
              className="select"
              value={form.foodPreference}
              onChange={(e) => set('foodPreference', e.target.value)}
            >
              {FOOD_PREFERENCES.map((f) => (
                <option key={f} value={f}>
                  {FOOD_PREFERENCE_LABELS[f]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Indoor or outdoor" error={errors.venueSetting}>
            <select className="select" value={form.venueSetting} onChange={(e) => set('venueSetting', e.target.value)}>
              {VENUE_SETTINGS.map((v) => (
                <option key={v} value={v}>
                  {VENUE_SETTING_LABELS[v]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Cultural or personal requirements"
          optional
          error={errors.culturalNotes}
          hint="Rituals, functions, accessibility needs, dietary rules."
        >
          <textarea
            className="textarea"
            value={form.culturalNotes}
            maxLength={600}
            onChange={(e) => set('culturalNotes', e.target.value)}
          />
        </Field>
        <fieldset className="fieldset">
          <legend>
            What matters most? <span className="optional muted">(optional)</span>
          </legend>
          <div className="option-grid">
            {PLANNING_PRIORITIES.map((priority) => (
              <label key={priority} className="option">
                <input
                  type="checkbox"
                  checked={form.priorities.includes(priority)}
                  onChange={() => togglePriority(priority)}
                />
                {PLANNING_PRIORITY_LABELS[priority]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
