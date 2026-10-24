import { todayInZone } from '@shared/dates';

/** Today's date in India, in the same YYYY-MM-DD form the API uses. */
export const getToday = (): string => todayInZone();
