import type { RequestHandler } from 'express';
// One-process demo limiter. Never key by client-supplied forwarding headers/contact data.
export const createConsultationRateLimit = (limit = 5, windowMs = 15 * 60_000, now = Date.now): RequestHandler => {
  const attempts = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const time = now();
    for (const [key, entry] of attempts) if (entry.until <= time) attempts.delete(key);
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = attempts.get(key) || { count: 0, until: time + windowMs };
    if (entry.count >= limit || (!attempts.has(key) && attempts.size >= 10_000)) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.until - time) / 1000))));
      res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.' } }); return;
    }
    entry.count++; attempts.set(key, entry); next();
  };
};
