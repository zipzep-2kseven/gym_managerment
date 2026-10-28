import { adminDashboardRouter } from './admin-dashboard.routes.js';
import { adminGymInspectionRouter } from './admin-gym-inspection.routes.js';
import { adminUserRouter } from './admin-user.routes.js';
import { reviewModerationRouter } from './review-moderation.routes.js';
import { reviewRouter } from './review.routes.js';
import { trainerProfileRouter } from './trainer-profile.routes.js';
import { galleryRouter } from './gallery.routes.js';
import { consultationRouter } from './consultation.routes.js';
import { reportRouter } from './report.routes.js';
import { ptWorkflowRouter } from './pt-workflow.routes.js';
import { paymentRouter } from './payment.routes.js';
import { gymManagementRouter } from './gym-management.routes.js';
import { packageRouter } from './package.routes.js';
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
apiRouter.use(adminGymInspectionRouter);
apiRouter.use(adminDashboardRouter);

apiRouter.use(packageRouter);

apiRouter.use(paymentRouter);

apiRouter.use(ptWorkflowRouter);

apiRouter.use(reportRouter);

apiRouter.use(consultationRouter);

apiRouter.use(galleryRouter);

apiRouter.use(trainerProfileRouter);

apiRouter.use(reviewRouter);

apiRouter.use(reviewModerationRouter);

apiRouter.use(adminUserRouter);
