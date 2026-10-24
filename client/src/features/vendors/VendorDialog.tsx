import { useState, type FormEvent } from 'react';
import {
  PAYMENT_STATUS_LABELS, PAYMENT_STATUSES, VENDOR_CATEGORIES, VENDOR_CATEGORY_LABELS, VENDOR_STATUS_LABELS, VENDOR_STATUSES,
} from '@shared/constants';
import { vendorInputSchema } from '@shared/schemas';
import type { VendorRecord } from '@shared/types';
import { Field } from '../../components/ui/Field';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { useWorkspaceMutation } from '../../hooks/useEvents';
import { api } from '../../lib/api';
import { fieldErrorsFromApi, fieldErrorsFromZod, type FieldErrors } from '../../lib/formErrors';
import { parseWholeNumber } from '../../lib/format';

const toAmount = (value: string): number => (value.trim() === '' ? 0 : parseWholeNumber(value));

export function VendorDialog({ eventId, vendor, onClose }: { eventId: string; vendor: VendorRecord | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: vendor?.name ?? '', category: vendor?.category ?? 'caterer', contact: vendor?.contact ?? '',
    quotedPrice: vendor && vendor.quotedPrice > 0 ? String(vendor.quotedPrice) : '', advanceAmount: vendor && vendor.advanceAmount > 0 ? String(vendor.advanceAmount) : '',
    paymentStatus: vendor?.paymentStatus ?? 'unpaid', bookingStatus: vendor?.bookingStatus ?? 'shortlisted',
    notes: vendor?.notes ?? '', followUpDate: vendor?.followUpDate ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<unknown>(null);
  const save = useWorkspaceMutation(eventId, (input: ReturnType<typeof vendorInputSchema.parse>) =>
    vendor ? api.updateVendor(eventId, vendor.id, input) : api.createVendor(eventId, input));
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const parsed = vendorInputSchema.safeParse({
      ...form, quotedPrice: toAmount(form.quotedPrice), advanceAmount: toAmount(form.advanceAmount), followUpDate: form.followUpDate === '' ? null : form.followUpDate,
    });
    if (!parsed.success) return setErrors(fieldErrorsFromZod(parsed.error));
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
    <Modal title={vendor ? 'Edit vendor' : 'Add vendor'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {failure !== null && <ErrorNotice error={failure} />}
        <div className="form-grid">
          <Field label="Vendor name" error={errors.name}><input className="input" value={form.name} maxLength={120} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Category" error={errors.category}><select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>{VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{VENDOR_CATEGORY_LABELS[c]}</option>)}</select></Field>
          <Field label="Contact details" optional error={errors.contact} hint="Phone or email you were given. Stored only in your account."><input className="input" value={form.contact} maxLength={200} onChange={(e) => set('contact', e.target.value)} /></Field>
          <Field label="Follow-up date" optional error={errors.followUpDate}><input className="input" type="date" value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} /></Field>
          <Field label="Quoted price (₹)" optional error={errors.quotedPrice} hint="The price the vendor told you."><input className="input" inputMode="numeric" value={form.quotedPrice} onChange={(e) => set('quotedPrice', e.target.value)} /></Field>
          <Field label="Booking advance (₹)" optional error={errors.advanceAmount}><input className="input" inputMode="numeric" value={form.advanceAmount} onChange={(e) => set('advanceAmount', e.target.value)} /></Field>
          <Field label="Booking status"><select className="select" value={form.bookingStatus} onChange={(e) => set('bookingStatus', e.target.value)}>{VENDOR_STATUSES.map((s) => <option key={s} value={s}>{VENDOR_STATUS_LABELS[s]}</option>)}</select></Field>
          <Field label="Payment status"><select className="select" value={form.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>)}</select></Field>
        </div>
        <Field label="Notes" optional error={errors.notes}><textarea className="textarea" value={form.notes} maxLength={500} onChange={(e) => set('notes', e.target.value)} /></Field>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : vendor ? 'Save changes' : 'Add vendor'}</button>
        </div>
      </form>
    </Modal>
  );
}
