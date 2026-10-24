import { describe, expect, it } from 'vitest';
import { EVENT_TYPES } from './constants';
import { addDays, daysBetween, isValidIsoDate, todayInZone } from './dates';
import { buildSampleWorkspace } from './sample';
import { dueDateFromLead, generateBaseTasks } from './taskTemplates';
import { eventBaseSchema, taskInputSchema, vendorInputSchema } from './schemas';

const TODAY = '2026-10-22';

describe('generateBaseTasks', () => {
  it.each(EVENT_TYPES)('produces valid tasks for %s events', (type) => {
    const tasks = generateBaseTasks(type, addDays(TODAY, 400), TODAY);
    expect(tasks.length).toBeGreaterThan(5);
    for (const task of tasks) expect(taskInputSchema.safeParse(task).success).toBe(true);
  });

  it('gives weddings longer lead times than birthdays', () => {
    const eventDate = addDays(TODAY, 400);
    const earliest = (type: 'wedding' | 'birthday') =>
      generateBaseTasks(type, eventDate, TODAY)
        .map((task) => daysBetween(task.dueDate ?? eventDate, eventDate))
        .reduce((max, lead) => Math.max(max, lead), 0);
    expect(earliest('wedding')).toBeGreaterThan(earliest('birthday'));
  });

  it('compresses the plan for a near-term event and never schedules before today', () => {
    const eventDate = addDays(TODAY, 20);
    const tasks = generateBaseTasks('wedding', eventDate, TODAY);
    for (const task of tasks) {
      expect((task.dueDate ?? '') >= TODAY).toBe(true);
      expect((task.dueDate ?? '9999') <= eventDate).toBe(true);
    }
  });

  it('puts everything on today when the event is today', () => {
    expect(generateBaseTasks('birthday', TODAY, TODAY).every((task) => task.dueDate === TODAY)).toBe(true);
  });

  it('leaves due dates empty without a date or for a date in the past', () => {
    expect(generateBaseTasks('birthday', null, TODAY).every((task) => task.dueDate === null)).toBe(true);
    expect(generateBaseTasks('birthday', '2026-01-01', TODAY).every((task) => task.dueDate === null)).toBe(true);
  });
});

describe('dueDateFromLead', () => {
  it('converts a lead time and clamps to today', () => {
    expect(dueDateFromLead('2026-12-31', 30, TODAY)).toBe('2026-12-01');
    expect(dueDateFromLead('2026-10-30', 100, TODAY)).toBe(TODAY);
    expect(dueDateFromLead(null, 10, TODAY)).toBeNull();
    expect(dueDateFromLead('2026-01-01', 10, TODAY)).toBeNull();
  });
});

describe('date helpers', () => {
  it('validates calendar dates strictly', () => {
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2027-02-29')).toBe(false);
    expect(isValidIsoDate('2027-1-5')).toBe(false);
  });

  it('computes India-local "today" across the UTC date boundary', () => {
    // 20:00 UTC on 21 Oct is already 22 Oct in India (UTC+05:30).
    expect(todayInZone(new Date('2026-10-21T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-10-22');
    expect(todayInZone(new Date('2026-10-21T20:00:00Z'), 'UTC')).toBe('2026-10-21');
  });
});

describe('sample workspace', () => {
  it('only contains data that passes the same validation as user input', () => {
    const sample = buildSampleWorkspace(TODAY);
    expect(eventBaseSchema.safeParse(sample.event).success).toBe(true);
    for (const vendor of sample.vendors) expect(vendorInputSchema.safeParse(vendor).success).toBe(true);
    expect(sample.event.name).toMatch(/^Sample/);
    expect(sample.vendors.every((vendor) => vendor.name.includes('(demo)'))).toBe(true);
  });
});
