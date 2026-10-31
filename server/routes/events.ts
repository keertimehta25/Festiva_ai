import { Router } from 'express';
import { defaultAllocations, scaleAllocations, sumAllocations } from '@shared/calc/budget';
import { LIMITS } from '@shared/constants';
import { eventCreateSchema, eventUpdateSchema, type Allocations } from '@shared/schemas';
import { analyzeEventInput } from '@shared/eventChecks';
import { buildSampleWorkspace } from '@shared/sample';
import { generateBaseTasks } from '@shared/taskTemplates';
import type { EventWithSummary } from '@shared/types';
import { AppError, parseWith } from '../errors';
import { currentUser } from '../middleware/auth';
import { buildSummary } from '../summary';
import { requireEvent, todayFor, type RouteDeps } from './context';

function assertAllocationsFit(allocations: Allocations, totalBudget: number): void {
  if (sumAllocations(allocations) > totalBudget) {
    throw new AppError(
      422,
      'ALLOCATION_EXCEEDS_BUDGET',
      'Category allocations cannot add up to more than the total budget',
    );
  }
}

export function createEventsRouter(deps: RouteDeps): Router {
  const router = Router();
  const { repo } = deps;

  router.get('/', async (_req, res) => {
    const user = currentUser(res);
    const today = todayFor(deps);
    const [events, stats] = await Promise.all([repo.events.list(user.id), repo.events.stats(user.id)]);
    const data: EventWithSummary[] = events.map((event) => ({
      // The full AI plan is large; the list only needs to know whether one exists.
      event: { ...event, plan: null },
      summary: buildSummary(event, stats.get(event.id), today),
    }));
    res.json({ data });
  });

  router.post('/', async (req, res) => {
    const user = currentUser(res);
    const today = todayFor(deps);
    const input = parseWith(eventCreateSchema(today), req.body);

    if ((await repo.events.list(user.id)).length >= LIMITS.maxEventsPerUser) {
      throw new AppError(
        409,
        'LIMIT_REACHED',
        `You can keep up to ${LIMITS.maxEventsPerUser} events. Delete one to add another.`,
      );
    }

    const event = await repo.events.create(user.id, {
      ...input,
      allocations: defaultAllocations(input.eventType, input.totalBudget),
      isSample: false,
    });
    const tasks = await repo.tasks.createMany(
      user.id,
      event.id,
      generateBaseTasks(input.eventType, input.eventDate, today),
    );
    res.status(201).json({ data: { event, tasks, notes: analyzeEventInput(input) } });
  });

  router.post('/sample', async (_req, res) => {
    const user = currentUser(res);
    const today = todayFor(deps);
    const existing = await repo.events.list(user.id);

    const already = existing.find((event) => event.isSample);
    if (already) {
      res.json({ data: { event: already, created: false } });
      return;
    }
    if (existing.length >= LIMITS.maxEventsPerUser) {
      throw new AppError(
        409,
        'LIMIT_REACHED',
        `You can keep up to ${LIMITS.maxEventsPerUser} events. Delete one to add the sample.`,
      );
    }

    const sample = buildSampleWorkspace(today);
    const event = await repo.events.create(user.id, {
      ...sample.event,
      allocations: defaultAllocations(sample.event.eventType, sample.event.totalBudget),
      isSample: true,
    });
    const vendors = await repo.vendors.createMany(user.id, event.id, sample.vendors);
    await repo.tasks.createMany(user.id, event.id, sample.tasks);
    await repo.expenses.createMany(
      user.id,
      event.id,
      sample.expenses.map(({ vendorIndex, ...expense }) => ({
        ...expense,
        vendorId: vendorIndex === null ? null : (vendors[vendorIndex]?.id ?? null),
      })),
    );
    res.status(201).json({ data: { event, created: true } });
  });

  router.get('/:id', async (req, res) => {
    const user = currentUser(res);
    const event = await requireEvent(deps, res, req.params.id);
    const [tasks, expenses, vendors] = await Promise.all([
      repo.tasks.list(user.id, event.id),
      repo.expenses.list(user.id, event.id),
      repo.vendors.list(user.id, event.id),
    ]);
    res.json({ data: { event, tasks, expenses, vendors } });
  });

  router.patch('/:id', async (req, res) => {
    const user = currentUser(res);
    const event = await requireEvent(deps, res, req.params.id);
    const { allocations: requested, ...fields } = parseWith(eventUpdateSchema, req.body);

    const totalBudget = fields.totalBudget ?? event.totalBudget;
    // Changing the total without supplying a split keeps the existing proportions.
    const allocations =
      requested ??
      (totalBudget !== event.totalBudget
        ? scaleAllocations(event.allocations, fields.eventType ?? event.eventType, totalBudget)
        : undefined);
    if (allocations) assertAllocationsFit(allocations, totalBudget);

    const updated = await repo.events.update(user.id, event.id, { ...fields, ...(allocations ? { allocations } : {}) });
    res.json({ data: { event: updated } });
  });

  router.delete('/:id', async (req, res) => {
    const event = await requireEvent(deps, res, req.params.id);
    await repo.events.remove(currentUser(res).id, event.id);
    res.status(204).end();
  });

  return router;
}
