import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { expenseInputSchema, expenseUpdateSchema, taskInputSchema, taskUpdateSchema, vendorInputSchema, vendorUpdateSchema } from '@shared/schemas';
import { LIMITS } from '@shared/constants';
import type { AiService } from './ai/aiService';
import type { AuthVerifier } from './auth/verifier';
import type { AppConfig } from './config';
import type { Repository } from './data/repository';
import { createErrorHandler, notFoundHandler } from './errors';
import type { Logger } from './logger';
import { requireAuth } from './middleware/auth';
import { aiLimiter, apiLimiter } from './middleware/rateLimit';
import { createAiRouter } from './routes/ai';
import { createCollectionRouter } from './routes/collections';
import type { RouteDeps } from './routes/context';
import { createEventsRouter } from './routes/events';

export interface AppDependencies {
  config: AppConfig;
  repo: Repository;
  ai: AiService;
  auth: AuthVerifier;
  logger: Logger;
  /** Clock, injectable so date-dependent behaviour is testable. */
  now?: () => Date;
  /** Request budgets per window; tests lower them to exercise throttling. */
  limits?: { api?: number; ai?: number };
}

/** Builds the Express app. All collaborators are injected, so tests never touch real services. */
export function createApp(dependencies: AppDependencies): Express {
  const { config, repo, ai, auth, logger } = dependencies;
  const deps: RouteDeps = { config, repo, ai, now: dependencies.now ?? (() => new Date()) };
  const isProduction = config.env === 'production';

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      // This server only returns JSON, so the strictest policy is safe.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    }),
  );
  app.use(
    cors({
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '50kb' }));
  app.use('/api', apiLimiter(dependencies.limits?.api));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok', aiConfigured: ai.isConfigured } });
  });

  const protectedApi = express.Router();
  protectedApi.use(requireAuth(auth));

  protectedApi.use('/events', createEventsRouter(deps));
  protectedApi.use(
    '/events/:eventId/tasks',
    createCollectionRouter(deps, {
      collection: repo.tasks,
      createSchema: taskInputSchema,
      updateSchema: taskUpdateSchema,
      maxPerEvent: LIMITS.maxTasksPerEvent,
      label: 'task',
      vendorIdOf: (input) => input.vendorId,
    }),
  );
  protectedApi.use(
    '/events/:eventId/expenses',
    createCollectionRouter(deps, {
      collection: repo.expenses,
      createSchema: expenseInputSchema,
      updateSchema: expenseUpdateSchema,
      maxPerEvent: LIMITS.maxExpensesPerEvent,
      label: 'expense',
      vendorIdOf: (input) => input.vendorId,
    }),
  );
  protectedApi.use(
    '/events/:eventId/vendors',
    createCollectionRouter(deps, {
      collection: repo.vendors,
      createSchema: vendorInputSchema,
      updateSchema: vendorUpdateSchema,
      maxPerEvent: LIMITS.maxVendorsPerEvent,
      label: 'vendor',
    }),
  );
  protectedApi.use('/events/:eventId/ai', aiLimiter(dependencies.limits?.ai), createAiRouter(deps));
  app.use('/api', protectedApi);

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger, isProduction));
  return app;
}
