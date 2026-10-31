import { FOOD_PREFERENCE_LABELS, FOOD_PREFERENCES, VENUE_SETTING_LABELS, VENUE_SETTINGS } from '@shared/constants';
import { eventUpdateSchema, type EventUpdate } from '@shared/schemas';
import type { EventRecord } from '@shared/types';
import { FormDialog, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui/FormControls';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { useFormDialog } from '../../hooks/useFormDialog';
import { api } from '../../lib/api';
import { blankToNull, parseWholeNumber } from '../../lib/format';

interface EditEventDialogProps {
  event: EventRecord;
  onClose: () => void;
}

export function EditEventDialog({ event, onClose }: EditEventDialogProps) {
  const mutation = useWorkspaceMutation(event.id, (patch: EventUpdate) => api.updateEvent(event.id, patch));
  const { form, set, errors, failure, submit } = useFormDialog({
    initial: {
      name: event.name,
      eventDate: event.eventDate ?? '',
      city: event.city,
      totalBudget: String(event.totalBudget),
      guestCount: String(event.guestCount),
      theme: event.theme,
      foodPreference: event.foodPreference,
      venueSetting: event.venueSetting,
      culturalNotes: event.culturalNotes,
    },
    schema: eventUpdateSchema,
    toInput: (values) => ({
      ...values,
      eventDate: blankToNull(values.eventDate),
      totalBudget: parseWholeNumber(values.totalBudget),
      guestCount: parseWholeNumber(values.guestCount),
    }),
    save: mutation.mutateAsync,
    onDone: onClose,
  });

  return (
    <FormDialog
      title="Edit event details"
      onClose={onClose}
      onSubmit={submit}
      failure={failure}
      pending={mutation.isPending}
      submitLabel="Save changes"
    >
      <div className="form-grid">
        <TextField
          label="Event name"
          value={form.name}
          maxLength={120}
          error={errors.name}
          onChange={(v) => set('name', v)}
        />
        <TextField
          label="Event date"
          optional
          type="date"
          value={form.eventDate}
          error={errors.eventDate}
          onChange={(v) => set('eventDate', v)}
        />
        <TextField
          label="City"
          optional
          value={form.city}
          maxLength={80}
          error={errors.city}
          onChange={(v) => set('city', v)}
        />
        <TextField
          label="Total budget (₹)"
          numeric
          value={form.totalBudget}
          error={errors.totalBudget}
          hint="Changing this rescales your category allocations proportionally."
          onChange={(v) => set('totalBudget', v)}
        />
        <TextField
          label="Guests"
          numeric
          value={form.guestCount}
          error={errors.guestCount}
          onChange={(v) => set('guestCount', v)}
        />
        <TextField
          label="Theme"
          optional
          value={form.theme}
          maxLength={200}
          error={errors.theme}
          onChange={(v) => set('theme', v)}
        />
        <SelectField
          label="Food preference"
          value={form.foodPreference}
          options={optionsFrom(FOOD_PREFERENCES, FOOD_PREFERENCE_LABELS)}
          onChange={(v) => set('foodPreference', v)}
        />
        <SelectField
          label="Indoor or outdoor"
          value={form.venueSetting}
          options={optionsFrom(VENUE_SETTINGS, VENUE_SETTING_LABELS)}
          onChange={(v) => set('venueSetting', v)}
        />
      </div>
      <TextAreaField
        label="Cultural or personal requirements"
        optional
        value={form.culturalNotes}
        maxLength={600}
        error={errors.culturalNotes}
        onChange={(v) => set('culturalNotes', v)}
      />
    </FormDialog>
  );
}
