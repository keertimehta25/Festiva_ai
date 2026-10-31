import { Router } from 'express';
import { chatRequestSchema } from '@shared/schemas';
import { analyzeEventInput } from '@shared/eventChecks';
import { dueDateFromLead } from '@shared/taskTemplates';
import { normalizePlan } from '@shared/planNormalizer';
import { AppError, parseWith } from '../errors';
import { sanitizeProposals } from '../ai/proposals';
import type { AiWorkspace } from '../ai/aiService';
import { currentUser } from '../middleware/auth';
import { eventIdParam, requireEvent, todayFor, type RouteDeps } from './context';

/** Event ids with a plan request already running, so a double click cannot cause two model calls. */
const plansInFlight = new Set<string>();

export function createAiRouter(deps: RouteDeps): Router {
  const router = Router({ mergeParams: true });
  const { repo, ai, config } = deps;

  async function loadWorkspace(res: Parameters<typeof currentUser>[0], rawId: unknown): Promise<AiWorkspace> {
    const user = currentUser(res);
    const event = await requireEvent(deps, res, rawId);
    const [tasks, expenses, vendors] = await Promise.all([
      repo.tasks.list(user.id, event.id),
      repo.expenses.list(user.id, event.id),
      repo.vendors.list(user.id, event.id),
    ]);
    return { event, tasks, expenses, vendors, today: todayFor(deps) };
  }

  router.post('/plan', async (req, res) => {
    const workspace = await loadWorkspace(res, eventIdParam(req));
    const { event } = workspace;
    if (plansInFlight.has(event.id)) {
      throw new AppError(409, 'PLAN_IN_PROGRESS', 'A plan is already being generated for this event');
    }

    plansInFlight.add(event.id);
    try {
      const notes = analyzeEventInput(event);
      const plan = normalizePlan(await ai.generatePlan({ workspace, notes }), event.totalBudget, config.gemini.model);
      const updated = await repo.events.update(currentUser(res).id, event.id, {
        plan,
        planGeneratedAt: new Date().toISOString(),
      });
      res.json({ data: { event: updated, notes } });
    } finally {
      plansInFlight.delete(event.id);
    }
  });

  router.post('/plan/apply-tasks', async (req, res) => {
    const user = currentUser(res);
    const workspace = await loadWorkspace(res, eventIdParam(req));
    const { event, tasks, today } = workspace;
    if (!event.plan) throw new AppError(409, 'NO_PLAN', 'Generate a plan first');

    const existingTitles = new Set(tasks.map((task) => task.title.trim().toLowerCase()));
    const fresh = event.plan.timeline.filter((item) => !existingTitles.has(item.title.trim().toLowerCase()));
    const created = await repo.tasks.createMany(
      user.id,
      event.id,
      fresh.map((item) => ({
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        status: 'pending' as const,
        dueDate: dueDateFromLead(event.eventDate, item.daysBeforeEvent, today),
        notes: '',
        vendorId: null,
      })),
    );
    res.status(201).json({ data: { created, skipped: event.plan.timeline.length - created.length } });
  });

  router.post('/plan/apply-budget', async (req, res) => {
    const event = await requireEvent(deps, res, eventIdParam(req));
    if (!event.plan) throw new AppError(409, 'NO_PLAN', 'Generate a plan first');
    const updated = await repo.events.update(currentUser(res).id, event.id, {
      allocations: event.plan.allocationAmounts,
    });
    res.json({ data: { event: updated } });
  });

  router.post('/chat', async (req, res) => {
    const { message, history } = parseWith(chatRequestSchema, req.body);
    const workspace = await loadWorkspace(res, eventIdParam(req));
    const reply = await ai.chat({ workspace, message, history });
    res.json({
      data: { reply: reply.reply, proposals: sanitizeProposals(reply.proposals, workspace.event, workspace.today) },
    });
  });

  router.post('/savings', async (req, res) => {
    const workspace = await loadWorkspace(res, eventIdParam(req));
    res.json({ data: await ai.suggestSavings({ workspace }) });
  });

  return router;
}
