import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { APP_NAME } from '@multi-gym/shared';
import { config } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiSecurityHeaders, requireTrustedOrigin } from './middleware/request-security.js';
import { AppError } from './utils/errors.js';

export const app = express();
app.disable('x-powered-by');
app.use('/api/v1', apiSecurityHeaders, requireTrustedOrigin);

app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })
);
// The authenticated photo routes own their bounded image parser; other JSON remains 100kb.
app.use((req, res, next) => req.method === 'POST' && /^\/api\/v1\/gyms\/[^/]+\/(reports|images)\/?$/.test(req.path)
  ? next() : express.json()(req, res, next));
app.use(cookieParser());

// Health-check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: `${APP_NAME} API`,
    timestamp: new Date().toISOString(),
  });
});

// Mount API v1 routes
app.use('/api/v1', apiRouter);
app.use('/api/v1', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy API.')));

// Centralized error handler
app.use(errorHandler);
