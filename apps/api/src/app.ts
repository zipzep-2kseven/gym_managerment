import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { APP_NAME } from '@multi-gym/shared';
import { config } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';

export const app = express();

app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
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

// Centralized error handler
app.use(errorHandler);
