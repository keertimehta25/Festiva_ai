import { addDays } from './dates';
import type { EventInput, ExpenseInput, TaskInput, VendorInput } from './schemas';
import { generateBaseTasks } from './taskTemplates';

export interface SampleExpense extends Omit<ExpenseInput, 'vendorId'> {
  /** Index into `vendors` for the vendor this expense belongs to, if any. */
  vendorIndex: number | null;
}

export interface SampleWorkspace {
  event: EventInput;
  tasks: TaskInput[];
  vendors: VendorInput[];
  expenses: SampleExpense[];
}

/**
 * A clearly labelled demo wedding so the app can be explored without manual setup.
 * Every name, quote and amount here is fictional example data, not a real vendor or price.
 */
export function buildSampleWorkspace(today: string): SampleWorkspace {
  const eventDate = addDays(today, 150);

  const tasks = generateBaseTasks('wedding', eventDate, today).map((task, index): TaskInput => {
    if (index < 3) return { ...task, status: 'completed' };
    if (index === 3) return { ...task, status: 'in_progress' };
    return task;
  });

  return {
    event: {
      name: 'Sample: Aanya & Rohan’s Wedding',
      eventType: 'wedding',
      eventDate,
      dateIsApproximate: false,
      city: 'Pune',
      venuePreference: 'Garden lawn with a covered banquet hall as a rain backup',
      totalBudget: 1_200_000,
      guestCount: 250,
      durationHours: 6,
      theme: 'Heritage Maharashtrian with modern touches',
      colors: 'Ivory, marigold and deep green',
      foodPreference: 'vegetarian',
      venueSetting: 'either',
      culturalNotes: 'Haldi, sangeet and wedding ceremony across two days. Pure vegetarian menu.',
      priorities: ['sustainability', 'convenience'],
      currency: 'INR',
    },
    tasks,
    vendors: [
      {
        name: 'Sample Garden Lawns (demo)',
        category: 'venue',
        contact: 'Demo contact only',
        quotedPrice: 240_000,
        advanceAmount: 60_000,
        paymentStatus: 'advance_paid',
        bookingStatus: 'booked',
        notes: 'Fictional sample vendor. Quote and terms are example data.',
        followUpDate: null,
      },
      {
        name: 'Sample Catering Co (demo)',
        category: 'caterer',
        contact: 'Demo contact only',
        quotedPrice: 350_000,
        advanceAmount: 0,
        paymentStatus: 'unpaid',
        bookingStatus: 'quoted',
        notes: 'Fictional sample vendor. Tasting to be scheduled.',
        followUpDate: addDays(today, 7),
      },
      {
        name: 'Sample Frames Photography (demo)',
        category: 'photographer',
        contact: 'Demo contact only',
        quotedPrice: 110_000,
        advanceAmount: 0,
        paymentStatus: 'unpaid',
        bookingStatus: 'contacted',
        notes: 'Fictional sample vendor.',
        followUpDate: addDays(today, 3),
      },
    ],
    expenses: [
      {
        title: 'Venue booking advance',
        category: 'venue',
        estimatedAmount: 240_000,
        actualAmount: 60_000,
        vendorIndex: 0,
        notes: 'Advance paid; balance due closer to the date.',
      },
      {
        title: 'Catering (per-plate estimate)',
        category: 'catering',
        estimatedAmount: 350_000,
        actualAmount: 0,
        vendorIndex: 1,
        notes: 'Estimate based on a sample quote.',
      },
      {
        title: 'Decor and florals',
        category: 'decoration',
        estimatedAmount: 150_000,
        actualAmount: 0,
        vendorIndex: null,
        notes: '',
      },
      {
        title: 'Wedding outfits',
        category: 'attire',
        estimatedAmount: 110_000,
        actualAmount: 130_000,
        vendorIndex: null,
        notes: 'Ran over the planned amount after fittings.',
      },
    ],
  };
}
