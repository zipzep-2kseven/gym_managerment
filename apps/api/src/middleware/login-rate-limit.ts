import type { RequestHandler } from 'express';

// Single-process demo protection: ten failed/in-flight login attempts per minute/IP.
// Use the socket-derived IP; forwarded headers are not trusted by this app.
export const createLoginRateLimit = (limit = 10, windowMs = 60_000, now = Date.now): RequestHandler => {
  const attempts = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const time = now();
    for (const [key, entry] of attempts) if (entry.until <= time) attempts.delete(key);
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = attempts.get(key) || { count: 0, until: time + windowMs };
    if (entry.count >= limit || (!attempts.has(key) && attempts.size >= 10_000)) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.until - time) / 1000))));
      res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Bạn đã đăng nhập sai nhiều lần. Vui lòng thử lại sau.', details: null } });
      return;
    }
    entry.count++; attempts.set(key, entry);
    // Reserve before Argon2 work to prevent concurrent attempts bypassing the limit.
    res.once('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && attempts.get(key) === entry) entry.count--;
    });
    next();
  };
};
