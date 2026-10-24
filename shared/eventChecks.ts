import { monthOf } from './dates';
import type { EventInput } from './schemas';

/** Below this budget per guest, a meal alone is likely to exceed the plan. */
const TIGHT_BUDGET_PER_GUEST = 300;
/** Indian monsoon months, when outdoor events need a rain plan. */
const MONSOON_MONTHS = [6, 7, 8, 9];

/**
 * Looks for combinations of inputs that are contradictory or risky and returns
 * plain-language notes. They are shown to the user and also passed to the AI so
 * the plan can address them or ask for clarification.
 */
export function analyzeEventInput(event: EventInput): string[] {
  const notes: string[] = [];
  const perGuest = event.totalBudget / event.guestCount;

  if (perGuest < TIGHT_BUDGET_PER_GUEST) {
    notes.push(
      `The budget works out to about ₹${Math.round(perGuest)} per guest, which is very tight. Expect to trim the guest list or simplify food and decor.`,
    );
  }
  if (event.priorities.includes('luxury') && event.priorities.includes('affordability')) {
    notes.push('Luxury and affordability are both selected. Pick the one that matters more if they conflict.');
  }
  if (event.foodPreference === 'vegan' && /non[- ]?veg|chicken|mutton|fish/i.test(event.culturalNotes)) {
    notes.push('Food preference is vegan but the notes mention non-vegetarian dishes.');
  }
  if (event.venueSetting === 'outdoor' && event.eventDate && MONSOON_MONTHS.includes(monthOf(event.eventDate))) {
    notes.push('An outdoor event during the monsoon needs a covered area or a rain backup venue.');
  }
  if (event.eventDate === null) {
    notes.push('No date was given, so the timeline will not have due dates until you add one.');
  }
  return notes;
}
