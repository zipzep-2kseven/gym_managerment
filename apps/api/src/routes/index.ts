import { gymManagementRouter } from './gym-management.routes.js';
import { publicTrainerRouter } from './public-trainer.routes.js';
import { gymWriteRouter } from './gym-write.routes.js';
import { publicGymRouter } from './public-gym.routes.js';
import { gymLifecycleRouter } from './gym-lifecycle.routes.js';
import { staffingRouter } from './staffing.routes.js';
import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

// Mount authentication routes under /auth
apiRouter.use('/auth', authRouter);

// Mount user routes under /users
apiRouter.use('/users', userRouter);


apiRouter.use(staffingRouter);

apiRouter.use(gymLifecycleRouter);

apiRouter.use(publicGymRouter);

apiRouter.use(gymWriteRouter);

apiRouter.use(publicTrainerRouter);

apiRouter.use(gymManagementRouter);
