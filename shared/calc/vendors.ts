import type { ExpenseRecord, VendorRecord } from '../types';

export interface VendorTotals {
  /** Sum of quotes from vendors that are still in play (everything except rejected). */
  quotedTotal: number;
  /** Sum of quotes from booked vendors. */
  committedTotal: number;
  /** Money already paid to vendors that are still in play. */
  paidTotal: number;
  /** Money still owed to booked vendors. */
  pendingTotal: number;
  bookedCount: number;
}

/** Amount already paid to a vendor, based on the recorded payment status. */
export function vendorPaid(vendor: Pick<VendorRecord, 'paymentStatus' | 'quotedPrice' | 'advanceAmount'>): number {
  if (vendor.paymentStatus === 'paid') return vendor.quotedPrice;
  if (vendor.paymentStatus === 'advance_paid') return Math.min(vendor.advanceAmount, vendor.quotedPrice);
  return 0;
}

export function vendorPending(vendor: Pick<VendorRecord, 'paymentStatus' | 'quotedPrice' | 'advanceAmount'>): number {
  return vendor.quotedPrice - vendorPaid(vendor);
}

export function summarizeVendors(vendors: VendorRecord[]): VendorTotals {
  const active = vendors.filter((vendor) => vendor.bookingStatus !== 'rejected');
  const booked = active.filter((vendor) => vendor.bookingStatus === 'booked');
  return {
    quotedTotal: active.reduce((total, vendor) => total + vendor.quotedPrice, 0),
    committedTotal: booked.reduce((total, vendor) => total + vendor.quotedPrice, 0),
    paidTotal: active.reduce((total, vendor) => total + vendorPaid(vendor), 0),
    pendingTotal: booked.reduce((total, vendor) => total + vendorPending(vendor), 0),
    bookedCount: booked.length,
  };
}

/** Actual spending recorded against a vendor through linked expenses. */
export function linkedExpenseTotal(expenses: ExpenseRecord[], vendorId: string): number {
  return expenses.filter((expense) => expense.vendorId === vendorId).reduce((total, expense) => total + expense.actualAmount, 0);
}

/** Vendors still being chased (not booked or rejected) whose follow-up date has arrived. */
export function followUpsDue(vendors: VendorRecord[], today: string): VendorRecord[] {
  return vendors
    .filter(
      (vendor) =>
        vendor.followUpDate !== null &&
        vendor.followUpDate <= today &&
        vendor.bookingStatus !== 'booked' &&
        vendor.bookingStatus !== 'rejected',
    )
    .sort((a, b) => (a.followUpDate ?? '').localeCompare(b.followUpDate ?? ''));
}
