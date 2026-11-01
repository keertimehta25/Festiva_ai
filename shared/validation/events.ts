import { z } from 'zod';
import {
  BUDGET_CATEGORIES,
  EVENT_TYPES,
  FOOD_PREFERENCES,
  LIMITS,
  PLANNING_PRIORITIES,
  VENUE_SETTINGS,
} from '../constants';
import { isoDate, money, partialUpdate, requiredText, text } from './fields';

export const allocationsSchema = z.record(z.enum(BUDGET_CATEGORIES), money);
export type Allocations = z.infer<typeof allocationsSchema>;

// Field rules without defaults. Update schemas use these directly so a partial update can
// never silently reset a field to its default; create schemas add defaults on top.
const eventCore = {
  name: requiredText(120, 'Event name'),
  eventType: z.enum(EVENT_TYPES, 'Choose an event type'),
  eventDate: isoDate.nullable(),
  dateIsApproximate: z.boolean(),
  city: text(80),
  venuePreference: text(200),
  totalBudget: money.min(1000, 'Budget must be at least ₹1,000'),
  guestCount: z
    .number('Enter the number of guests')
    .int('Guest count must be a whole number')
    .min(1, 'At least 1 guest is needed')
    .max(LIMITS.maxGuests, 'Guest count is too large'),
  durationHours: z
    .number('Enter the duration in hours')
    .int('Duration must be a whole number of hours')
    .min(1, 'Duration must be at least 1 hour')
    .max(LIMITS.maxDurationHours, 'Duration is too long'),
  theme: text(200),
  colors: text(120),
  foodPreference: z.enum(FOOD_PREFERENCES),
  venueSetting: z.enum(VENUE_SETTINGS),
  culturalNotes: text(600),
  priorities: z.array(z.enum(PLANNING_PRIORITIES)).max(PLANNING_PRIORITIES.length),
  currency: z.literal('INR'),
};

/** Event details without any "today" dependent rules. */
export const eventBaseSchema = z.object({
  ...eventCore,
  eventDate: eventCore.eventDate.default(null),
  dateIsApproximate: eventCore.dateIsApproximate.default(false),
  city: eventCore.city.default(''),
  venuePreference: eventCore.venuePreference.default(''),
  durationHours: eventCore.durationHours.default(4),
  theme: eventCore.theme.default(''),
  colors: eventCore.colors.default(''),
  foodPreference: eventCore.foodPreference.default('mixed'),
  venueSetting: eventCore.venueSetting.default('either'),
  culturalNotes: eventCore.culturalNotes.default(''),
  priorities: eventCore.priorities.default([]),
  currency: eventCore.currency.default('INR'),
});

/**
 * Creating an event: the date, when given, must not be in the past.
 * The rule sits on the field itself (not on the whole object) so the error is reported
 * together with errors in other fields instead of only after they are fixed.
 */
export function eventCreateSchema(today: string) {
  return eventBaseSchema.extend({
    eventDate: eventCore.eventDate
      .refine((date) => date === null || date >= today, 'Choose today or a future date')
      .default(null),
  });
}

/** Updating an event: every field optional; allocations may be replaced explicitly. */
export const eventUpdateSchema = partialUpdate({ ...eventCore, allocations: allocationsSchema });

export type EventInput = z.infer<typeof eventBaseSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
