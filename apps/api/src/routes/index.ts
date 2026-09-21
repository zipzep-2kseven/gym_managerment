import { Router } from 'express';
import { authRouter } from './auth.routes.js';

export const apiRouter = Router();

// Mount authentication routes under /auth
apiRouter.use('/auth', authRouter);
