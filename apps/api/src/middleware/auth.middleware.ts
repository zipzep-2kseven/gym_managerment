import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import { config } from '../config/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        roles: string[];
      };
    }
  }
}

/**
 * Authentication Middleware:
 * 1. Reads JWT from HttpOnly cookie (auth_token).
 * 2. Verifies cryptographic signature and expiration.
 * 3. Populates req.user with verified subject identity (sub = userId).
 * 4. Rejects missing, malformed, invalid, or expired tokens with HTTP 401 UNAUTHORIZED.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.[config.cookie.name];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError();
    }

    try {
      const decoded = verifyJwt(token);
      if (!decoded || !decoded.sub || typeof decoded.sub !== 'string') {
        throw new UnauthorizedError();
      }

      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      };
      next();
    } catch {
      // Do not leak JWT internal error details (e.g. signature mismatch, expired timestamp)
      throw new UnauthorizedError();
    }
  } catch (error) {
    next(error);
  }
}
