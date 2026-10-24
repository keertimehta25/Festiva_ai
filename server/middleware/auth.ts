import type { RequestHandler, Response } from 'express';
import type { AuthUser, AuthVerifier } from '../auth/verifier';
import { AppError } from '../errors';

const BEARER = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/;

/** Rejects requests that do not carry a valid access token; otherwise stores the user on the response. */
export function requireAuth(verifier: AuthVerifier): RequestHandler {
  return async (req, res, next) => {
    const match = BEARER.exec(req.header('authorization') ?? '');
    if (!match?.[1]) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');

    const user = await verifier.verify(match[1]);
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again');

    res.locals.user = user;
    next();
  };
}

export function currentUser(res: Response): AuthUser {
  return res.locals.user as AuthUser;
}
