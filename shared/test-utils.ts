import { BUDGET_CATEGORIES } from './constants';
import type { AiPlan, Allocations } from './schemas';
import type { EventRecord, ExpenseRecord, TaskRecord, VendorRecord } from './types';

const STAMP = '2026-01-01T00:00:00.000Z';
let counter = 0;
const nextId = (): string => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

export function makeAllocations(overrides: Partial<Allocations> = {}): Allocations {
  const base = Object.fromEntries(BUDGET_CATEGORIES.map((category) => [category, 0])) as Allocations;
  return { ...base, ...overrides };
}

export function makeExpense(overrides: Partial<ExpenseRecord> = {}): ExpenseRecord {
  return {
    id: nextId(),
    eventId: 'event-1',
    title: 'Expense',
    category: 'miscellaneous',
    estimatedAmount: 0,
    actualAmount: 0,
    vendorId: null,
    notes: '',
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: nextId(),
    eventId: 'event-1',
    title: 'Task',
    description: '',
    dueDate: null,
    priority: 'medium',
    status: 'pending',
    category: 'planning',
    notes: '',
    vendorId: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export function makeVendor(overrides: Partial<VendorRecord> = {}): VendorRecord {
  return {
    id: nextId(),
    eventId: 'event-1',
    name: 'Vendor',
    category: 'caterer',
    contact: '',
    quotedPrice: 0,
    advanceAmount: 0,
    paymentStatus: 'unpaid',
    bookingStatus: 'shortlisted',
    notes: '',
    followUpDate: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: nextId(),
    name: 'Test wedding',
    eventType: 'wedding',
    eventDate: '2027-02-14',
    dateIsApproximate: false,
    city: 'Pune',
    venuePreference: '',
    totalBudget: 800_000,
    guestCount: 300,
    durationHours: 6,
    theme: '',
    colors: '',
    foodPreference: 'vegetarian',
    venueSetting: 'either',
    culturalNotes: '',
    priorities: [],
    currency: 'INR',
    allocations: makeAllocations({ venue: 200_000, catering: 300_000, decoration: 100_000, miscellaneous: 200_000 }),
    plan: null,
    planGeneratedAt: null,
    isSample: false,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

/** A well-formed AI plan with estimates that fit an ₹8 lakh budget. */
export function makeAiPlan(overrides: Partial<AiPlan> = {}): AiPlan {
  return {
    concept: {
      title: 'Heritage garden wedding',
      summary: 'A warm, family-first celebration.',
      themeIdeas: ['Marigold arches'],
    },
    assumptions: ['Prices are rough estimates for a mid-size Indian city.'],
    budgetAllocation: [
      { category: 'venue', percent: 25, rationale: 'Garden lawn' },
      { category: 'catering', percent: 75, rationale: 'Large guest list' },
    ],
    expenseEstimates: [{ category: 'catering', item: 'Dinner for 300', estimatedAmount: 450_000.4 }],
    timeline: [
      {
        title: 'Book venue',
        description: 'Visit three venues',
        category: 'venue',
        priority: 'high',
        daysBeforeEvent: 180,
      },
      {
        title: 'Order invitations',
        description: 'Finalise wording',
        category: 'invitations',
        priority: 'medium',
        daysBeforeEvent: 60,
      },
    ],
    vendorChecklist: [{ category: 'caterer', questionsToAsk: ['Is a tasting included?'] }],
    guestChecklist: ['Collect addresses'],
    ideas: {
      decoration: ['Marigolds'],
      food: ['Regional thali'],
      activities: ['Mehendi corner'],
      entertainment: ['Live band'],
    },
    daySchedule: [{ time: '18:00', activity: 'Guests arrive', notes: '' }],
    risks: [{ risk: 'Rain', contingency: 'Covered hall on standby' }],
    costSavingTips: ['Use seasonal flowers'],
    personalRecommendations: ['Prioritise sustainability with reusable decor'],
    clarifyingQuestions: [],
    ...overrides,
  };
}
