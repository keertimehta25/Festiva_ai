import { z } from 'zod';
import { PAYMENT_STATUSES, VENDOR_CATEGORIES, VENDOR_STATUSES } from '../constants';
import { isoDate, money, partialUpdate, requiredText, text } from './fields';

const vendorCore = {
  name: requiredText(120, 'Vendor name'),
  category: z.enum(VENDOR_CATEGORIES, 'Choose a category'),
  contact: text(200),
  quotedPrice: money,
  advanceAmount: money,
  paymentStatus: z.enum(PAYMENT_STATUSES),
  bookingStatus: z.enum(VENDOR_STATUSES),
  notes: text(500),
  followUpDate: isoDate.nullable(),
};

export const vendorInputSchema = z
  .object({
    ...vendorCore,
    contact: vendorCore.contact.default(''),
    quotedPrice: vendorCore.quotedPrice.default(0),
    advanceAmount: vendorCore.advanceAmount.default(0),
    paymentStatus: vendorCore.paymentStatus.default('unpaid'),
    bookingStatus: vendorCore.bookingStatus.default('shortlisted'),
    notes: vendorCore.notes.default(''),
    followUpDate: vendorCore.followUpDate.default(null),
  })
  .refine((vendor) => vendor.advanceAmount <= vendor.quotedPrice, {
    path: ['advanceAmount'],
    message: 'The advance cannot be more than the quoted price',
  });
export type VendorInput = z.infer<typeof vendorInputSchema>;

export const vendorUpdateSchema = partialUpdate(vendorCore);
