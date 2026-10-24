import type { Request, Response } from 'express';
import { idSchema } from '@shared/schemas';
import { todayInZone } from '@shared/dates';
import type { EventRecord } from '@shared/types';
import type { AiService } from '../ai/aiService';
import type { AppConfig } from '../config';
import type { Repository } from '../data/repository';
import { notFound } from '../errors';
import { currentUser } from '../middleware/auth';

/** Dependencies handed to every router, so tests can substitute fakes. */
export interface RouteDeps {
  config: AppConfig;
  repo: Repository;
  ai: AiService;
  now: () => Date;
}

export const todayFor = (deps: RouteDeps): string => todayInZone(deps.now(), deps.config.timeZone);

/**
 * Loads an event that belongs to the signed-in user. A missing event and someone else's
 * event produce the same 404, so ids cannot be probed to discover other users' data.
 */
export async function requireEvent(deps: RouteDeps, res: Response, rawId: unknown): Promise<EventRecord> {
  const id = idSchema.safeParse(rawId);
  if (!id.success) throw notFound('Event');
  const event = await deps.repo.events.get(currentUser(res).id, id.data);
  if (!event) throw notFound('Event');
  return event;
}

/** Reads the :eventId segment from a nested route (typed loosely by Express for merged params). */
export const eventIdParam = (req: Request): unknown => (req.params as Record<string, string | undefined>).eventId;
