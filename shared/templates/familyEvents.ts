import type { TemplateTask } from './template';
import { t } from './template';

/** Starter tasks for a birthday. */
export const BIRTHDAY_TASKS: TemplateTask[] = [
  t('Set budget and draft guest list', 'planning', 'high', 45, 'Decide the total spend and who to invite.'),
  t(
    'Book the venue or prepare the home space',
    'venue',
    'high',
    35,
    'Confirm the date, timings and what the venue allows (food, music, decor).',
  ),
  t(
    'Choose the menu and book a caterer',
    'catering',
    'high',
    30,
    'Plan food for the guest mix, including children and dietary needs.',
  ),
  t(
    'Plan theme and decorations',
    'decoration',
    'medium',
    21,
    'Pick a theme and colours; order balloons, banners and props.',
  ),
  t(
    'Book entertainment or a photographer',
    'entertainment',
    'medium',
    21,
    'Arrange a host, games, magician, DJ or photographer if wanted.',
  ),
  t('Send invitations', 'invitations', 'high', 21, 'Share invites with date, time, location and RSVP contact.'),
  t('Order the cake', 'catering', 'medium', 10, 'Confirm flavour, size, eggless options and the delivery time.'),
  t('Arrange return gifts and party supplies', 'miscellaneous', 'low', 5, 'Buy return gifts, tableware and games.'),
  t('Follow up on RSVPs', 'guests', 'medium', 7, 'Confirm the final headcount with the caterer or venue.'),
  t('Reconfirm vendors', 'planning', 'high', 3, 'Confirm delivery and arrival times with every vendor.'),
];

/** Starter tasks for an anniversary. */
export const ANNIVERSARY_TASKS: TemplateTask[] = [
  t(
    'Set budget and decide the guest list',
    'planning',
    'high',
    60,
    'Choose between an intimate dinner and a larger gathering.',
  ),
  t('Book the venue', 'venue', 'high', 45, 'Confirm the date, seating and any special arrangements.'),
  t('Plan the menu with a caterer', 'catering', 'high', 35, 'Pick favourite dishes and confirm the final menu.'),
  t('Plan decorations and flowers', 'decoration', 'medium', 28, 'Choose a theme and book a decorator or florist.'),
  t(
    'Arrange photography and entertainment',
    'photography',
    'medium',
    28,
    'Book a photographer and any music or performance.',
  ),
  t('Send invitations', 'invitations', 'high', 21, 'Share invites with date, time and location.'),
  t(
    'Organise a memory display or surprise',
    'miscellaneous',
    'low',
    14,
    'Collect photos and messages for a slideshow or memory wall.',
  ),
  t('Confirm RSVPs and headcount', 'guests', 'medium', 7, 'Share final numbers with the venue and caterer.'),
  t('Reconfirm vendors', 'planning', 'high', 3, 'Confirm arrival times and any balance payments.'),
];
