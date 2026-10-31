import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUS_LABELS,
  VENDOR_STATUSES,
} from '@shared/constants';
import { vendorInputSchema, type VendorInput } from '@shared/schemas';
import type { VendorRecord } from '@shared/types';
import { FormDialog, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui/FormControls';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { useFormDialog } from '../../hooks/useFormDialog';
import { api } from '../../lib/api';
import { amountToText, blankToNull, parseOptionalAmount } from '../../lib/format';

interface VendorDialogProps {
  eventId: string;
  vendor: VendorRecord | null;
  onClose: () => void;
}

export function VendorDialog({ eventId, vendor, onClose }: VendorDialogProps) {
  const mutation = useWorkspaceMutation(eventId, (input: VendorInput) =>
    vendor ? api.updateVendor(eventId, vendor.id, input) : api.createVendor(eventId, input),
  );
  const { form, set, errors, failure, submit } = useFormDialog({
    initial: {
      name: vendor?.name ?? '',
      category: vendor?.category ?? 'caterer',
      contact: vendor?.contact ?? '',
      quotedPrice: amountToText(vendor?.quotedPrice),
      advanceAmount: amountToText(vendor?.advanceAmount),
      paymentStatus: vendor?.paymentStatus ?? 'unpaid',
      bookingStatus: vendor?.bookingStatus ?? 'shortlisted',
      notes: vendor?.notes ?? '',
      followUpDate: vendor?.followUpDate ?? '',
    },
    schema: vendorInputSchema,
    toInput: (values) => ({
      ...values,
      quotedPrice: parseOptionalAmount(values.quotedPrice),
      advanceAmount: parseOptionalAmount(values.advanceAmount),
      followUpDate: blankToNull(values.followUpDate),
    }),
    save: mutation.mutateAsync,
    onDone: onClose,
  });

  return (
    <FormDialog
      title={vendor ? 'Edit vendor' : 'Add vendor'}
      onClose={onClose}
      onSubmit={submit}
      failure={failure}
      pending={mutation.isPending}
      submitLabel={vendor ? 'Save changes' : 'Add vendor'}
    >
      <div className="form-grid">
        <TextField
          label="Vendor name"
          value={form.name}
          maxLength={120}
          error={errors.name}
          onChange={(v) => set('name', v)}
        />
        <SelectField
          label="Category"
          value={form.category}
          error={errors.category}
          options={optionsFrom(VENDOR_CATEGORIES, VENDOR_CATEGORY_LABELS)}
          onChange={(v) => set('category', v)}
        />
        <TextField
          label="Contact details"
          optional
          value={form.contact}
          maxLength={200}
          error={errors.contact}
          hint="Phone or email you were given. Stored only in your account."
          onChange={(v) => set('contact', v)}
        />
        <TextField
          label="Follow-up date"
          optional
          type="date"
          value={form.followUpDate}
          error={errors.followUpDate}
          onChange={(v) => set('followUpDate', v)}
        />
        <TextField
          label="Quoted price (₹)"
          optional
          numeric
          value={form.quotedPrice}
          error={errors.quotedPrice}
          hint="The price the vendor told you."
          onChange={(v) => set('quotedPrice', v)}
        />
        <TextField
          label="Booking advance (₹)"
          optional
          numeric
          value={form.advanceAmount}
          error={errors.advanceAmount}
          onChange={(v) => set('advanceAmount', v)}
        />
        <SelectField
          label="Booking status"
          value={form.bookingStatus}
          options={optionsFrom(VENDOR_STATUSES, VENDOR_STATUS_LABELS)}
          onChange={(v) => set('bookingStatus', v)}
        />
        <SelectField
          label="Payment status"
          value={form.paymentStatus}
          options={optionsFrom(PAYMENT_STATUSES, PAYMENT_STATUS_LABELS)}
          onChange={(v) => set('paymentStatus', v)}
        />
      </div>
      <TextAreaField
        label="Notes"
        optional
        value={form.notes}
        maxLength={500}
        error={errors.notes}
        onChange={(v) => set('notes', v)}
      />
    </FormDialog>
  );
}
