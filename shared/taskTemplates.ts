import type { EventType, TaskCategory, Priority } from './constants';
import { addDays, daysBetween } from './dates';
import type { TaskInput } from './schemas';

interface TemplateTask {
  title: string;
  description: string;
  category: TaskCategory;
  priority: Priority;
  /** How many days before the event this task should ideally be finished. */
  leadDays: number;
}

const t = (title: string, category: TaskCategory, priority: Priority, leadDays: number, description: string): TemplateTask => ({
  title,
  description,
  category,
  priority,
  leadDays,
});

const TEMPLATES: Record<EventType, TemplateTask[]> = {
  wedding: [
    t('Fix budget and draft guest list', 'planning', 'high', 240, 'Agree the total budget with both families and list the likely guests for each function.'),
    t('Book the venue and confirm dates', 'venue', 'high', 210, 'Visit shortlisted venues, compare quotes and pay the booking advance in writing.'),
    t('Shortlist caterers and plan a tasting', 'catering', 'high', 180, 'Compare menus, per-plate quotes and tasting slots for each function.'),
    t('Book photographer and videographer', 'photography', 'high', 180, 'Review portfolios, confirm coverage hours and deliverables.'),
    t('Book decorator and florist', 'decoration', 'medium', 150, 'Share colour palette and mood references; get itemised quotes.'),
    t('Plan outfits, jewellery and fittings', 'attire', 'medium', 150, 'Order outfits early so alterations can be done without a rush.'),
    t('Book makeup artist and hair stylist', 'attire', 'medium', 120, 'Schedule a trial and confirm travel and timing for the day.'),
    t('Arrange guest accommodation and travel', 'accommodation', 'medium', 120, 'Block rooms for out-of-town guests and share pickup details.'),
    t('Book music, DJ or sangeet performers', 'entertainment', 'medium', 100, 'Confirm the playlist, sound requirements and rehearsal slots.'),
    t('Design and order invitations', 'invitations', 'high', 90, 'Finalise wording, languages and print or digital format.'),
    t('Send invitations', 'invitations', 'high', 60, 'Send printed cards and digital invites to every guest on the list.'),
    t('Track RSVPs and finalise headcount', 'guests', 'medium', 30, 'Follow up with guests who have not replied; confirm final numbers with the caterer.'),
    t('Confirm transport for family and guests', 'transportation', 'medium', 21, 'Arrange vehicles for the baraat, airport pickups and venue shuttles.'),
    t('Reconfirm all vendors and pending payments', 'planning', 'high', 7, 'Call every vendor, confirm arrival times and settle the balances that are due.'),
    t('Share the day-of schedule with family and vendors', 'planning', 'medium', 2, 'Give a point person to each function so the family can enjoy the day.'),
  ],
  birthday: [
    t('Set budget and draft guest list', 'planning', 'high', 45, 'Decide the total spend and who to invite.'),
    t('Book the venue or prepare the home space', 'venue', 'high', 35, 'Confirm the date, timings and what the venue allows (food, music, decor).'),
    t('Choose the menu and book a caterer', 'catering', 'high', 30, 'Plan food for the guest mix, including children and dietary needs.'),
    t('Plan theme and decorations', 'decoration', 'medium', 21, 'Pick a theme and colours; order balloons, banners and props.'),
    t('Book entertainment or a photographer', 'entertainment', 'medium', 21, 'Arrange a host, games, magician, DJ or photographer if wanted.'),
    t('Send invitations', 'invitations', 'high', 21, 'Share invites with date, time, location and RSVP contact.'),
    t('Order the cake', 'catering', 'medium', 10, 'Confirm flavour, size, eggless options and the delivery time.'),
    t('Arrange return gifts and party supplies', 'miscellaneous', 'low', 5, 'Buy return gifts, tableware and games.'),
    t('Follow up on RSVPs', 'guests', 'medium', 7, 'Confirm the final headcount with the caterer or venue.'),
    t('Reconfirm vendors', 'planning', 'high', 3, 'Confirm delivery and arrival times with every vendor.'),
  ],
  anniversary: [
    t('Set budget and decide the guest list', 'planning', 'high', 60, 'Choose between an intimate dinner and a larger gathering.'),
    t('Book the venue', 'venue', 'high', 45, 'Confirm the date, seating and any special arrangements.'),
    t('Plan the menu with a caterer', 'catering', 'high', 35, 'Pick favourite dishes and confirm the final menu.'),
    t('Plan decorations and flowers', 'decoration', 'medium', 28, 'Choose a theme and book a decorator or florist.'),
    t('Arrange photography and entertainment', 'photography', 'medium', 28, 'Book a photographer and any music or performance.'),
    t('Send invitations', 'invitations', 'high', 21, 'Share invites with date, time and location.'),
    t('Organise a memory display or surprise', 'miscellaneous', 'low', 14, 'Collect photos and messages for a slideshow or memory wall.'),
    t('Confirm RSVPs and headcount', 'guests', 'medium', 7, 'Share final numbers with the venue and caterer.'),
    t('Reconfirm vendors', 'planning', 'high', 3, 'Confirm arrival times and any balance payments.'),
  ],
  community: [
    t('Define goals, audience and budget', 'planning', 'high', 90, 'Write a one-page brief and agree roles with the organising team.'),
    t('Check permissions and local requirements', 'planning', 'high', 85, 'Ask the venue owner and local authorities what permissions are needed; keep written confirmations.'),
    t('Book the venue or ground', 'venue', 'high', 75, 'Confirm capacity, power, water, toilets and parking.'),
    t('Recruit volunteers and assign roles', 'guests', 'medium', 60, 'Create a roster covering registration, crowd flow, food and clean-up.'),
    t('Look for sponsors and contributions', 'miscellaneous', 'medium', 60, 'Prepare a short sponsorship note and track every commitment.'),
    t('Plan the programme and entertainment', 'entertainment', 'high', 45, 'Fix the running order, performers, sound and lighting.'),
    t('Arrange food and water', 'catering', 'high', 35, 'Plan food for the expected crowd with dietary options.'),
    t('Publicise the event', 'invitations', 'medium', 30, 'Share posters, messaging-group notices and local announcements.'),
    t('Arrange transport and parking guidance', 'transportation', 'low', 21, 'Plan signage, parking volunteers and accessible access.'),
    t('Prepare first aid and safety plan', 'planning', 'high', 14, 'Set up first aid, emergency contacts and a rain or heat contingency.'),
    t('Brief volunteers and reconfirm vendors', 'planning', 'high', 3, 'Walk through the schedule and confirm every vendor arrival time.'),
  ],
  college: [
    t('Get approval from faculty and administration', 'planning', 'high', 60, 'Submit the proposal, budget and safety plan for sign-off.'),
    t('Form committees and assign leads', 'planning', 'high', 55, 'Create teams for logistics, publicity, hospitality and technical needs.'),
    t('Secure sponsors and a budget', 'miscellaneous', 'high', 50, 'Prepare a sponsorship deck and track every commitment.'),
    t('Book the hall or ground', 'venue', 'high', 45, 'Confirm timings, capacity and rehearsal access.'),
    t('Open registrations and publicise', 'invitations', 'high', 35, 'Launch a registration form and share posters on campus channels.'),
    t('Book sound, lights and performers', 'entertainment', 'medium', 28, 'Confirm technical riders and rehearsal slots.'),
    t('Plan food, water and decorations', 'catering', 'medium', 21, 'Arrange food stalls or catering and set up a decoration team.'),
    t('Arrange volunteers, ID badges and passes', 'guests', 'medium', 14, 'Issue badges and brief volunteers on their duties.'),
    t('Set up a safety and first aid plan', 'planning', 'high', 10, 'Identify exits, first aid and emergency contacts.'),
    t('Run a full rehearsal and reconfirm vendors', 'planning', 'high', 3, 'Walk through the whole programme with all teams.'),
  ],
  custom: [
    t('Define the goal and set a budget', 'planning', 'high', 60, 'Write down what a successful event looks like and what you can spend.'),
    t('Book the venue', 'venue', 'high', 45, 'Confirm the date, capacity and rules.'),
    t('Plan food and drink', 'catering', 'medium', 35, 'Choose a menu that suits your guests.'),
    t('Plan decorations and theme', 'decoration', 'medium', 28, 'Pick a look and order supplies.'),
    t('Arrange entertainment', 'entertainment', 'medium', 28, 'Book performers, music or activities.'),
    t('Send invitations', 'invitations', 'high', 21, 'Share date, time, place and RSVP details.'),
    t('Track RSVPs', 'guests', 'medium', 7, 'Confirm headcount with vendors.'),
    t('Reconfirm vendors', 'planning', 'high', 3, 'Confirm timings and balance payments.'),
  ],
};

/**
 * Builds a starter task list from the event type and date.
 * - Lead times are longer for weddings than for birthdays.
 * - If the event is closer than the ideal lead time, due dates are compressed proportionally
 *   and never fall before today.
 * - Without a date (or for a date in the past) tasks are created without due dates.
 */
export function generateBaseTasks(eventType: EventType, eventDate: string | null, today: string): TaskInput[] {
  const template = TEMPLATES[eventType];
  const daysAvailable = eventDate === null ? null : daysBetween(today, eventDate);
  const longestLead = Math.max(...template.map((task) => task.leadDays));
  const scale = daysAvailable === null ? 1 : Math.min(1, Math.max(daysAvailable, 0) / longestLead);

  return template.map((task) => {
    let dueDate: string | null = null;
    if (eventDate !== null && daysAvailable !== null && daysAvailable >= 0) {
      const due = addDays(eventDate, -Math.round(task.leadDays * scale));
      dueDate = due < today ? today : due;
    }
    return {
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      status: 'pending',
      dueDate,
      notes: '',
      vendorId: null,
    };
  });
}

/** Converts a "days before the event" offset (as returned by the AI plan) into a due date. */
export function dueDateFromLead(eventDate: string | null, daysBeforeEvent: number, today: string): string | null {
  if (eventDate === null || eventDate < today) return null;
  const due = addDays(eventDate, -daysBeforeEvent);
  return due < today ? today : due;
}
