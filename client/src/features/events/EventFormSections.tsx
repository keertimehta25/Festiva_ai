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
import { SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui/FormControls';
import { Notice } from '../../components/ui/Notice';
import { getToday } from '../../hooks/useToday';
import type { FieldErrors } from '../../lib/formErrors';
import type { EventFormState, SetEventField } from './eventFormState';

interface SectionProps {
  form: EventFormState;
  errors: FieldErrors;
  set: SetEventField;
}

/** Event type, name, date, city and venue. */
export function BasicsSection({ form, errors, set }: SectionProps) {
  return (
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
                onChange={() => {
                  set('eventType', type);
                }}
              />
              {EVENT_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
        {errors.eventType && <p className="field-error">{errors.eventType}</p>}
      </fieldset>
      <div className="form-grid">
        <TextField
          label="Event name"
          value={form.name}
          maxLength={120}
          autoComplete="off"
          error={errors.name}
          onChange={(v) => {
            set('name', v);
          }}
        />
        <TextField
          label="Event date"
          optional
          type="date"
          value={form.eventDate}
          min={getToday()}
          error={errors.eventDate}
          hint="Leave empty if you have not decided yet."
          onChange={(v) => {
            set('eventDate', v);
          }}
        />
        <TextField
          label="City"
          optional
          value={form.city}
          maxLength={80}
          autoComplete="address-level2"
          error={errors.city}
          onChange={(v) => {
            set('city', v);
          }}
        />
        <TextField
          label="Venue preference"
          optional
          value={form.venuePreference}
          maxLength={200}
          error={errors.venuePreference}
          hint="For example: banquet hall, lawn, home, community ground."
          onChange={(v) => {
            set('venuePreference', v);
          }}
        />
      </div>
      <label className="option w-fit">
        <input
          type="checkbox"
          checked={form.dateIsApproximate}
          onChange={(e) => {
            set('dateIsApproximate', e.target.checked);
          }}
        />
        The date is approximate
      </label>
    </section>
  );
}

/** Budget, guest count and duration, with any sanity-check notes from `analyzeEventInput`. */
export function ScaleSection({ form, errors, set, notes }: SectionProps & { notes: string[] }) {
  return (
    <section className="card" aria-labelledby="scale-heading">
      <h2 id="scale-heading">Budget and guests</h2>
      <div className="form-grid">
        <TextField
          label="Estimated budget (₹)"
          numeric
          value={form.totalBudget}
          error={errors.totalBudget}
          hint="Whole rupees, for example 800000 or 8,00,000."
          onChange={(v) => {
            set('totalBudget', v);
          }}
        />
        <TextField
          label="Expected guests"
          numeric
          value={form.guestCount}
          error={errors.guestCount}
          onChange={(v) => {
            set('guestCount', v);
          }}
        />
        <TextField
          label="Duration (hours)"
          optional
          numeric
          value={form.durationHours}
          error={errors.durationHours}
          onChange={(v) => {
            set('durationHours', v);
          }}
        />
      </div>
      {notes.length > 0 && (
        <Notice tone="warning" live>
          <ul className="tight-list">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Notice>
      )}
    </section>
  );
}

/** Theme, colours, food, venue setting, cultural notes and planning priorities. */
export function StyleSection({ form, errors, set }: SectionProps) {
  const togglePriority = (priority: PlanningPriority) => {
    const chosen = form.priorities.includes(priority)
      ? form.priorities.filter((p) => p !== priority)
      : [...form.priorities, priority];
    set('priorities', chosen);
  };

  return (
    <section className="card" aria-labelledby="style-heading">
      <h2 id="style-heading">Style and preferences</h2>
      <div className="form-grid">
        <TextField
          label="Theme or style"
          optional
          value={form.theme}
          maxLength={200}
          error={errors.theme}
          onChange={(v) => {
            set('theme', v);
          }}
        />
        <TextField
          label="Preferred colours"
          optional
          value={form.colors}
          maxLength={120}
          error={errors.colors}
          onChange={(v) => {
            set('colors', v);
          }}
        />
        <SelectField
          label="Food preference"
          value={form.foodPreference}
          error={errors.foodPreference}
          options={optionsFrom(FOOD_PREFERENCES, FOOD_PREFERENCE_LABELS)}
          onChange={(v) => {
            set('foodPreference', v);
          }}
        />
        <SelectField
          label="Indoor or outdoor"
          value={form.venueSetting}
          error={errors.venueSetting}
          options={optionsFrom(VENUE_SETTINGS, VENUE_SETTING_LABELS)}
          onChange={(v) => {
            set('venueSetting', v);
          }}
        />
      </div>
      <TextAreaField
        label="Cultural or personal requirements"
        optional
        value={form.culturalNotes}
        maxLength={600}
        error={errors.culturalNotes}
        hint="Rituals, functions, accessibility needs, dietary rules."
        onChange={(v) => {
          set('culturalNotes', v);
        }}
      />
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
                onChange={() => {
                  togglePriority(priority);
                }}
              />
              {PLANNING_PRIORITY_LABELS[priority]}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
