/** Domain constants shared by the API and the web client. */

export const EVENT_TYPES = ['wedding', 'birthday', 'anniversary', 'community', 'college', 'custom'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  community: 'Community event',
  college: 'College event',
  custom: 'Custom event',
};

export const BUDGET_CATEGORIES = [
  'venue',
  'catering',
  'decoration',
  'photography',
  'entertainment',
  'attire',
  'invitations',
  'transportation',
  'accommodation',
  'miscellaneous',
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  venue: 'Venue',
  catering: 'Catering',
  decoration: 'Decoration',
  photography: 'Photography',
  entertainment: 'Entertainment',
  attire: 'Attire & styling',
  invitations: 'Invitations',
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  miscellaneous: 'Miscellaneous',
};

export const TASK_CATEGORIES = ['planning', 'guests', ...BUDGET_CATEGORIES] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  planning: 'Planning',
  guests: 'Guests',
  ...BUDGET_CATEGORY_LABELS,
};

export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
};

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

export const VENDOR_CATEGORIES = [
  'venue',
  'caterer',
  'photographer',
  'decorator',
  'makeup_artist',
  'florist',
  'entertainment',
  'invitation_designer',
  'transportation',
  'other',
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];
export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  venue: 'Venue',
  caterer: 'Caterer',
  photographer: 'Photographer',
  decorator: 'Decorator',
  makeup_artist: 'Makeup artist',
  florist: 'Florist',
  entertainment: 'Entertainment',
  invitation_designer: 'Invitation designer',
  transportation: 'Transportation',
  other: 'Other',
};

/** Which budget category a vendor's cost normally belongs to. */
export const VENDOR_TO_BUDGET_CATEGORY: Record<VendorCategory, BudgetCategory> = {
  venue: 'venue',
  caterer: 'catering',
  photographer: 'photography',
  decorator: 'decoration',
  makeup_artist: 'attire',
  florist: 'decoration',
  entertainment: 'entertainment',
  invitation_designer: 'invitations',
  transportation: 'transportation',
  other: 'miscellaneous',
};

export const VENDOR_STATUSES = ['shortlisted', 'contacted', 'quoted', 'booked', 'rejected'] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];
export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  shortlisted: 'Shortlisted',
  contacted: 'Contacted',
  quoted: 'Quoted',
  booked: 'Booked',
  rejected: 'Rejected',
};

export const PAYMENT_STATUSES = ['unpaid', 'advance_paid', 'paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  advance_paid: 'Advance paid',
  paid: 'Paid in full',
};

export const FOOD_PREFERENCES = ['vegetarian', 'non_vegetarian', 'mixed', 'vegan', 'jain'] as const;
export type FoodPreference = (typeof FOOD_PREFERENCES)[number];
export const FOOD_PREFERENCE_LABELS: Record<FoodPreference, string> = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-vegetarian',
  mixed: 'Vegetarian and non-vegetarian',
  vegan: 'Vegan',
  jain: 'Jain',
};

export const VENUE_SETTINGS = ['indoor', 'outdoor', 'either'] as const;
export type VenueSetting = (typeof VENUE_SETTINGS)[number];
export const VENUE_SETTING_LABELS: Record<VenueSetting, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  either: 'No preference',
};

export const PLANNING_PRIORITIES = ['affordability', 'luxury', 'sustainability', 'accessibility', 'convenience'] as const;
export type PlanningPriority = (typeof PLANNING_PRIORITIES)[number];
export const PLANNING_PRIORITY_LABELS: Record<PlanningPriority, string> = {
  affordability: 'Affordability',
  luxury: 'Luxury',
  sustainability: 'Sustainability',
  accessibility: 'Accessibility',
  convenience: 'Convenience',
};

/** Hard limits that keep inputs and stored data bounded. */
export const LIMITS = {
  maxMoney: 1_000_000_000,
  maxGuests: 100_000,
  maxDurationHours: 240,
  maxEventsPerUser: 20,
  maxTasksPerEvent: 200,
  maxExpensesPerEvent: 300,
  maxVendorsPerEvent: 100,
  maxChatMessageChars: 1_000,
  maxChatHistory: 6,
} as const;

/** Share of the total budget each category receives by default, per event type (percent, sums to 100). */
export const DEFAULT_ALLOCATION_PERCENT: Record<EventType, Record<BudgetCategory, number>> = {
  wedding: { venue: 20, catering: 30, decoration: 12, photography: 10, entertainment: 6, attire: 8, invitations: 2, transportation: 3, accommodation: 5, miscellaneous: 4 },
  birthday: { venue: 15, catering: 40, decoration: 15, photography: 5, entertainment: 12, attire: 3, invitations: 2, transportation: 2, accommodation: 0, miscellaneous: 6 },
  anniversary: { venue: 20, catering: 35, decoration: 14, photography: 8, entertainment: 8, attire: 5, invitations: 2, transportation: 3, accommodation: 0, miscellaneous: 5 },
  community: { venue: 18, catering: 28, decoration: 10, photography: 4, entertainment: 18, attire: 0, invitations: 4, transportation: 6, accommodation: 0, miscellaneous: 12 },
  college: { venue: 12, catering: 25, decoration: 12, photography: 5, entertainment: 25, attire: 0, invitations: 3, transportation: 4, accommodation: 0, miscellaneous: 14 },
  custom: { venue: 20, catering: 30, decoration: 12, photography: 6, entertainment: 10, attire: 4, invitations: 3, transportation: 5, accommodation: 4, miscellaneous: 6 },
};
