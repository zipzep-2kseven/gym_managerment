import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

// Mount authentication routes under /auth
apiRouter.use('/auth', authRouter);

// Mount user routes under /users
apiRouter.use('/users', userRouter);

