import type { ErrorRequestHandler, RequestHandler } from 'express';
import { type z } from 'zod';
import type { ApiErrorBody } from '@shared/types';
import type { Logger } from './logger';

/** An error that is safe to show to the client: it carries an HTTP status and a stable code. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string[]>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}

export const notFound = (what = 'Resource'): AppError => new AppError(404, 'NOT_FOUND', `${what} not found`);

/** Validates untrusted input against a schema and converts failures into a 400 response. */
export function parseWith<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const details: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_';
    (details[field] ??= []).push(issue.message);
  }
  throw new AppError(400, 'VALIDATION_ERROR', 'Some fields need attention', details);
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound('Route'));

/** Single place where every error becomes a predictable JSON response. */
export function createErrorHandler(logger: Logger, isProduction: boolean): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      if (err.status >= 500) {
        const cause = err.cause instanceof Error ? ` (${err.cause.message})` : '';
        logger.error(`${err.code}: ${err.message}${cause}`);
      }
      const body: ApiErrorBody = { error: { code: err.code, message: err.message, details: err.details } };
      res.status(err.status).json(body);
      return;
    }

    const parseError = err as { type?: string };
    if (parseError.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON' } });
      return;
    }
    if (parseError.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large' } });
      return;
    }

    // Only the error name and message are logged: never request bodies, tokens or keys.
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error';
    logger.error(`Unhandled error: ${detail}`);
    const message = isProduction ? 'Something went wrong on our side' : `Unhandled error: ${detail}`;
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } });
  };
}
