import express, { Request, Response } from 'express';
import cors from 'cors';
import { APP_NAME } from '@multi-gym/shared';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';

export const app = express();

app.use(cors());
app.use(express.json());

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
