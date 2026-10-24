import { describe, expect, it } from 'vitest';
import { describeDaysUntil, formatDate, formatRupees, parseWholeNumber } from './format';

describe('formatters', () => {
  it('formats rupees with Indian digit grouping and keeps the sign', () => {
    expect(formatRupees(0)).toBe('₹0');
    expect(formatRupees(800_000)).toBe('₹8,00,000');
    expect(formatRupees(12_345_678)).toBe('₹1,23,45,678');
    expect(formatRupees(-30_000)).toBe('-₹30,000');
  });

  it('formats calendar dates without time-zone shifts', () => {
    expect(formatDate('2026-10-22')).toBe('22 Oct 2026');
    expect(formatDate('2027-01-01')).toBe('1 Jan 2027');
    expect(formatDate(null)).toBe('No date');
  });

  it('describes distance to the event in words', () => {
    expect(describeDaysUntil(null)).toBe('Date not set');
    expect(describeDaysUntil(0)).toBe('Today');
    expect(describeDaysUntil(1)).toBe('Tomorrow');
    expect(describeDaysUntil(45)).toBe('In 45 days');
    expect(describeDaysUntil(-1)).toBe('Yesterday');
    expect(describeDaysUntil(-9)).toBe('9 days ago');
  });

  it('parses typed rupee amounts strictly', () => {
    expect(parseWholeNumber('1,50,000')).toBe(150_000);
    expect(parseWholeNumber(' ₹ 8000 ')).toBe(8000);
    for (const bad of ['', '-5', '12.5', 'abc', '1e5', '0x10']) expect(parseWholeNumber(bad)).toBeNaN();
  });
});
