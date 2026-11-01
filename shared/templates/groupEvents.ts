import type { TemplateTask } from './template';
import { t } from './template';

/** Starter tasks for a community event. */
export const COMMUNITY_TASKS: TemplateTask[] = [
  t(
    'Define goals, audience and budget',
    'planning',
    'high',
    90,
    'Write a one-page brief and agree roles with the organising team.',
  ),
  t(
    'Check permissions and local requirements',
    'planning',
    'high',
    85,
    'Ask the venue owner and local authorities what permissions are needed; keep written confirmations.',
  ),
  t('Book the venue or ground', 'venue', 'high', 75, 'Confirm capacity, power, water, toilets and parking.'),
  t(
    'Recruit volunteers and assign roles',
    'guests',
    'medium',
    60,
    'Create a roster covering registration, crowd flow, food and clean-up.',
  ),
  t(
    'Look for sponsors and contributions',
    'miscellaneous',
    'medium',
    60,
    'Prepare a short sponsorship note and track every commitment.',
  ),
  t(
    'Plan the programme and entertainment',
    'entertainment',
    'high',
    45,
    'Fix the running order, performers, sound and lighting.',
  ),
  t('Arrange food and water', 'catering', 'high', 35, 'Plan food for the expected crowd with dietary options.'),
  t(
    'Publicise the event',
    'invitations',
    'medium',
    30,
    'Share posters, messaging-group notices and local announcements.',
  ),
  t(
    'Arrange transport and parking guidance',
    'transportation',
    'low',
    21,
    'Plan signage, parking volunteers and accessible access.',
  ),
  t(
    'Prepare first aid and safety plan',
    'planning',
    'high',
    14,
    'Set up first aid, emergency contacts and a rain or heat contingency.',
  ),
  t(
    'Brief volunteers and reconfirm vendors',
    'planning',
    'high',
    3,
    'Walk through the schedule and confirm every vendor arrival time.',
  ),
];

/** Starter tasks for a college event. */
export const COLLEGE_TASKS: TemplateTask[] = [
  t(
    'Get approval from faculty and administration',
    'planning',
    'high',
    60,
    'Submit the proposal, budget and safety plan for sign-off.',
  ),
  t(
    'Form committees and assign leads',
    'planning',
    'high',
    55,
    'Create teams for logistics, publicity, hospitality and technical needs.',
  ),
  t(
    'Secure sponsors and a budget',
    'miscellaneous',
    'high',
    50,
    'Prepare a sponsorship deck and track every commitment.',
  ),
  t('Book the hall or ground', 'venue', 'high', 45, 'Confirm timings, capacity and rehearsal access.'),
  t(
    'Open registrations and publicise',
    'invitations',
    'high',
    35,
    'Launch a registration form and share posters on campus channels.',
  ),
  t(
    'Book sound, lights and performers',
    'entertainment',
    'medium',
    28,
    'Confirm technical riders and rehearsal slots.',
  ),
  t(
    'Plan food, water and decorations',
    'catering',
    'medium',
    21,
    'Arrange food stalls or catering and set up a decoration team.',
  ),
  t(
    'Arrange volunteers, ID badges and passes',
    'guests',
    'medium',
    14,
    'Issue badges and brief volunteers on their duties.',
  ),
  t('Set up a safety and first aid plan', 'planning', 'high', 10, 'Identify exits, first aid and emergency contacts.'),
  t(
    'Run a full rehearsal and reconfirm vendors',
    'planning',
    'high',
    3,
    'Walk through the whole programme with all teams.',
  ),
];

/** Starter tasks for any other event. */
export const CUSTOM_TASKS: TemplateTask[] = [
  t(
    'Define the goal and set a budget',
    'planning',
    'high',
    60,
    'Write down what a successful event looks like and what you can spend.',
  ),
  t('Book the venue', 'venue', 'high', 45, 'Confirm the date, capacity and rules.'),
  t('Plan food and drink', 'catering', 'medium', 35, 'Choose a menu that suits your guests.'),
  t('Plan decorations and theme', 'decoration', 'medium', 28, 'Pick a look and order supplies.'),
  t('Arrange entertainment', 'entertainment', 'medium', 28, 'Book performers, music or activities.'),
  t('Send invitations', 'invitations', 'high', 21, 'Share date, time, place and RSVP details.'),
  t('Track RSVPs', 'guests', 'medium', 7, 'Confirm headcount with vendors.'),
  t('Reconfirm vendors', 'planning', 'high', 3, 'Confirm timings and balance payments.'),
];
