import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';

export const apiSecurityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
};

// CORS governs response visibility; it does not prevent cookie-authenticated writes.
// Native clients without browser source headers remain supported.
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  let source: string | undefined;
  try {
    if (origin !== undefined) {
      const parsed = new URL(origin);
      if (parsed.origin !== origin) throw new Error('Invalid origin');
      source = parsed.origin;
    } else if (referer !== undefined) {
      source = new URL(referer).origin;
    }
  } catch {
    return next(new AppError(403, 'UNTRUSTED_ORIGIN', 'Nguồn gửi yêu cầu không được phép.'));
  }
  if (source ? !config.cors.origin.includes(source) : req.get('Sec-Fetch-Site') !== undefined) {
    return next(new AppError(403, 'UNTRUSTED_ORIGIN', 'Nguồn gửi yêu cầu không được phép.'));
  }
  next();
};
