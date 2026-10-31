import { Router } from 'express';
import type { z } from 'zod';
import { idSchema } from '@shared/schemas';
import { AppError, notFound, parseWith } from '../errors';
import type { ChildCollection } from '../data/repository';
import { currentUser } from '../middleware/auth';
import { eventIdParam, requireEvent, type RouteDeps } from './context';

interface CollectionRouteOptions<Input extends object, Rec extends Input & { id: string }> {
  collection: ChildCollection<Input, Rec>;
  /** Rules for a complete record. Also re-applied to the merged result of an update. */
  createSchema: z.ZodType<Input>;
  updateSchema: z.ZodType<Partial<Input>>;
  maxPerEvent: number;
  label: string;
  /** For records that may reference a vendor (tasks and expenses): reads that reference from input. */
  vendorIdOf?: (input: Partial<Input>) => string | null | undefined;
}

/**
 * Builds create / update / delete routes for a collection that belongs to one event.
 * Mounted at /api/events/:eventId/<name>; the event must belong to the signed-in user.
 */
export function createCollectionRouter<Input extends object, Rec extends Input & { id: string }>(
  deps: RouteDeps,
  options: CollectionRouteOptions<Input, Rec>,
): Router {
  const router = Router({ mergeParams: true });
  const { collection, label } = options;

  async function assertVendorBelongsToEvent(userId: string, eventId: string, input: Partial<Input>): Promise<void> {
    const vendorId = options.vendorIdOf?.(input);
    if (!vendorId) return;
    const vendors = await deps.repo.vendors.list(userId, eventId);
    if (!vendors.some((vendor) => vendor.id === vendorId)) {
      throw new AppError(422, 'INVALID_VENDOR', 'That vendor does not belong to this event');
    }
  }

  router.post('/', async (req, res) => {
    const user = currentUser(res);
    const event = await requireEvent(deps, res, eventIdParam(req));
    const input = parseWith(options.createSchema, req.body);

    if ((await collection.list(user.id, event.id)).length >= options.maxPerEvent) {
      throw new AppError(409, 'LIMIT_REACHED', `An event can have up to ${options.maxPerEvent} ${label}s`);
    }
    await assertVendorBelongsToEvent(user.id, event.id, input);

    res.status(201).json({ data: await collection.create(user.id, event.id, input) });
  });

  router.patch('/:itemId', async (req, res) => {
    const user = currentUser(res);
    const event = await requireEvent(deps, res, eventIdParam(req));
    const itemId = idSchema.safeParse(req.params.itemId);
    if (!itemId.success) throw notFound(label);

    const patch = parseWith(options.updateSchema, req.body);
    const existing = (await collection.list(user.id, event.id)).find((record) => record.id === itemId.data);
    if (!existing) throw notFound(label);

    parseWith(options.createSchema, { ...existing, ...patch });
    await assertVendorBelongsToEvent(user.id, event.id, patch);

    const updated = await collection.update(user.id, event.id, itemId.data, patch);
    if (!updated) throw notFound(label);
    res.json({ data: updated });
  });

  router.delete('/:itemId', async (req, res) => {
    const user = currentUser(res);
    const event = await requireEvent(deps, res, eventIdParam(req));
    const itemId = idSchema.safeParse(req.params.itemId);
    if (!itemId.success || !(await collection.remove(user.id, event.id, itemId.data))) throw notFound(label);
    res.status(204).end();
  });

  return router;
}
