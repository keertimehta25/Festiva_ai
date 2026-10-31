import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import type { AuthUser } from '../auth/verifier';

function limiter(options: { windowMs: number; limit: number; message: string; perUser: boolean }): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req, res) => {
      const user = res.locals.user as AuthUser | undefined;
      return options.perUser && user ? user.id : ipKeyGenerator(req.ip ?? '');
    },
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: options.message } });
    },
  });
}

/** Broad protection for every API route, per client IP. */
export const apiLimiter = (limit = 300): RequestHandler =>
  limiter({
    windowMs: 15 * 60_000,
    limit,
    perUser: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  });

/** Stricter, per signed-in user, for routes that call the paid/limited AI provider. */
export const aiLimiter = (limit = 20): RequestHandler =>
  limiter({
    windowMs: 10 * 60_000,
    limit,
    perUser: true,
    message: 'You have used the AI assistant a lot recently. Please wait a few minutes and try again.',
  });
