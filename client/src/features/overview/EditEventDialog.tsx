import { useState, type SyntheticEvent } from 'react';
import { eventUpdateSchema } from '@shared/schemas';
import { FOOD_PREFERENCE_LABELS, FOOD_PREFERENCES, VENUE_SETTING_LABELS, VENUE_SETTINGS } from '@shared/constants';
import type { EventRecord } from '@shared/types';
import { Field } from '../../components/ui/Field';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '../../lib/formErrors';
import { parseWholeNumber } from '../../lib/format';

export function EditEventDialog({ event, onClose }: { event: EventRecord; onClose: () => void }) {
  const [form, setForm] = useState({
    name: event.name,
    eventDate: event.eventDate ?? '',
    city: event.city,
    totalBudget: String(event.totalBudget),
    guestCount: String(event.guestCount),
    theme: event.theme,
    foodPreference: event.foodPreference,
    venueSetting: event.venueSetting,
    culturalNotes: event.culturalNotes,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<unknown>(null);
  const save = useWorkspaceMutation(event.id, (patch: Parameters<typeof api.updateEvent>[1]) =>
    api.updateEvent(event.id, patch),
  );
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(submitEvent: SyntheticEvent) {
    submitEvent.preventDefault();
    setFailure(null);
    const parsed = eventUpdateSchema.safeParse({
      name: form.name,
      eventDate: form.eventDate === '' ? null : form.eventDate,
      city: form.city,
      totalBudget: parseWholeNumber(form.totalBudget),
      guestCount: parseWholeNumber(form.guestCount),
      theme: form.theme,
      foodPreference: form.foodPreference,
      venueSetting: form.venueSetting,
      culturalNotes: form.culturalNotes,
    });
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(parsed.data);
      onClose();
    } catch (error) {
      setErrors(fieldErrorsFromApi(error));
      setFailure(error);
    }
  }

  return (
    <Modal title="Edit event details" onClose={onClose}>
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        {failure !== null && <ErrorNotice error={failure} />}
        <div className="form-grid">
          <Field label="Event name" error={errors.name}>
            <input className="input" value={form.name} maxLength={120} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Event date" optional error={errors.eventDate}>
            <input
              className="input"
              type="date"
              value={form.eventDate}
              onChange={(e) => set('eventDate', e.target.value)}
            />
          </Field>
          <Field label="City" optional error={errors.city}>
            <input className="input" value={form.city} maxLength={80} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field
            label="Total budget (₹)"
            error={errors.totalBudget}
            hint="Changing this rescales your category allocations proportionally."
          >
            <input
              className="input"
              inputMode="numeric"
              value={form.totalBudget}
              onChange={(e) => set('totalBudget', e.target.value)}
            />
          </Field>
          <Field label="Guests" error={errors.guestCount}>
            <input
              className="input"
              inputMode="numeric"
              value={form.guestCount}
              onChange={(e) => set('guestCount', e.target.value)}
            />
          </Field>
          <Field label="Theme" optional error={errors.theme}>
            <input
              className="input"
              value={form.theme}
              maxLength={200}
              onChange={(e) => set('theme', e.target.value)}
            />
          </Field>
          <Field label="Food preference">
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
          <Field label="Indoor or outdoor">
            <select className="select" value={form.venueSetting} onChange={(e) => set('venueSetting', e.target.value)}>
              {VENUE_SETTINGS.map((v) => (
                <option key={v} value={v}>
                  {VENUE_SETTING_LABELS[v]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Cultural or personal requirements" optional error={errors.culturalNotes}>
          <textarea
            className="textarea"
            value={form.culturalNotes}
            maxLength={600}
            onChange={(e) => set('culturalNotes', e.target.value)}
          />
        </Field>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
