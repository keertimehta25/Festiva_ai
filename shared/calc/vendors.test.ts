import { describe, expect, it } from 'vitest';
import { makeExpense, makeVendor } from '../test-utils';
import { followUpsDue, linkedExpenseTotal, summarizeVendors, vendorPaid, vendorPending } from './vendors';

describe('vendor payments', () => {
  it('derives the paid and pending amounts from the payment status', () => {
    const base = { quotedPrice: 100_000, advanceAmount: 25_000 };
    expect(vendorPaid({ ...base, paymentStatus: 'unpaid' })).toBe(0);
    expect(vendorPaid({ ...base, paymentStatus: 'advance_paid' })).toBe(25_000);
    expect(vendorPending({ ...base, paymentStatus: 'advance_paid' })).toBe(75_000);
    expect(vendorPaid({ ...base, paymentStatus: 'paid' })).toBe(100_000);
    expect(vendorPending({ ...base, paymentStatus: 'paid' })).toBe(0);
  });
});

describe('summarizeVendors', () => {
  it('excludes rejected vendors and counts pending money only for booked ones', () => {
    const totals = summarizeVendors([
      makeVendor({
        bookingStatus: 'booked',
        quotedPrice: 200_000,
        advanceAmount: 50_000,
        paymentStatus: 'advance_paid',
      }),
      makeVendor({ bookingStatus: 'quoted', quotedPrice: 80_000 }),
      makeVendor({ bookingStatus: 'rejected', quotedPrice: 999_999 }),
    ]);
    expect(totals).toEqual({
      quotedTotal: 280_000,
      committedTotal: 200_000,
      paidTotal: 50_000,
      pendingTotal: 150_000,
      bookedCount: 1,
    });
  });

  it('is all zeros for an empty list', () => {
    expect(summarizeVendors([])).toEqual({
      quotedTotal: 0,
      committedTotal: 0,
      paidTotal: 0,
      pendingTotal: 0,
      bookedCount: 0,
    });
  });
});

describe('vendor-linked data', () => {
  it('sums actual spending of expenses linked to a vendor', () => {
    const vendor = makeVendor();
    const expenses = [
      makeExpense({ vendorId: vendor.id, actualAmount: 10_000 }),
      makeExpense({ vendorId: vendor.id, actualAmount: 5_000 }),
      makeExpense({ vendorId: null, actualAmount: 99_000 }),
    ];
    expect(linkedExpenseTotal(expenses, vendor.id)).toBe(15_000);
  });

  it('lists follow-ups that are due for vendors still being chased', () => {
    const due = makeVendor({ name: 'Due', followUpDate: '2026-10-20', bookingStatus: 'contacted' });
    const later = makeVendor({ name: 'Later', followUpDate: '2026-11-20', bookingStatus: 'contacted' });
    const booked = makeVendor({ name: 'Booked', followUpDate: '2026-10-01', bookingStatus: 'booked' });
    expect(followUpsDue([later, booked, due], '2026-10-22').map((vendor) => vendor.name)).toEqual(['Due']);
  });
});
