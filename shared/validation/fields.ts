import { z } from 'zod';
import { LIMITS } from '../constants';
import { isValidIsoDate } from '../dates';

/** Removes control characters (keeps tab, newline, carriage return) from untrusted text. */
export function stripControlChars(value: string): string {
  let result = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    const isControl = (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127;
    if (!isControl) result += char;
  }
  return result;
}

export const text = (max: number) =>
  z
    .string()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => stripControlChars(v).trim());
export const requiredText = (max: number, label: string) =>
  text(max).refine((v) => v.length > 0, `${label} is required`);

export const money = z
  .number('Enter a valid amount')
  .int('Enter a whole number of rupees')
  .min(0, 'Amount cannot be negative')
  .max(LIMITS.maxMoney, 'Amount is too large');

export const isoDate = z.string().refine(isValidIsoDate, 'Enter a valid date');

export const idSchema = z.uuid('Invalid id');

const NO_FIELDS_MESSAGE = 'Provide at least one field to update';

/** Turns a field map into a partial-update schema that rejects an empty patch. */
export function partialUpdate<Shape extends z.ZodRawShape>(shape: Shape) {
  return z
    .object(shape)
    .partial()
    .refine((patch) => Object.keys(patch).length > 0, NO_FIELDS_MESSAGE);
}
