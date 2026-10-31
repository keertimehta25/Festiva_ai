import type { PlanningPriority } from '@shared/constants';
import { blankToNull, parseWholeNumber } from '../../lib/format';

/** Everything the user types, kept as text until the form is validated. */
export interface EventFormState {
  eventType: string;
  name: string;
  eventDate: string;
  dateIsApproximate: boolean;
  city: string;
  venuePreference: string;
  totalBudget: string;
  guestCount: string;
  durationHours: string;
  theme: string;
  colors: string;
  foodPreference: string;
  venueSetting: string;
  culturalNotes: string;
  priorities: PlanningPriority[];
}

export type SetEventField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => void;

export const INITIAL_EVENT_FORM: EventFormState = {
  eventType: 'wedding',
  name: '',
  eventDate: '',
  dateIsApproximate: false,
  city: '',
  venuePreference: '',
  totalBudget: '',
  guestCount: '',
  durationHours: '4',
  theme: '',
  colors: '',
  foodPreference: 'mixed',
  venueSetting: 'either',
  culturalNotes: '',
  priorities: [],
};

/** Empty or non-numeric text becomes NaN so the schema reports "enter a valid number". */
const toNumber = (value: string): number => (value.trim() === '' ? Number.NaN : parseWholeNumber(value));

/** The typed text converted to the shape the event schema validates. */
export function toEventCandidate(form: EventFormState) {
  return {
    ...form,
    eventDate: blankToNull(form.eventDate),
    totalBudget: toNumber(form.totalBudget),
    guestCount: toNumber(form.guestCount),
    durationHours: toNumber(form.durationHours),
  };
}
