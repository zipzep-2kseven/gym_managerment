import { Router } from 'express';
import {
  getProfileController,
  updateProfileController,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const userRouter = Router();

/**
 * FEAT-AUTH-004: Get Current User Profile
 * GET /api/v1/users/me/profile
 */
userRouter.get('/me/profile', authenticate, getProfileController);

/**
 * FEAT-AUTH-005: Update Current User Profile
 * PATCH /api/v1/users/me/profile
 */
userRouter.patch('/me/profile', authenticate, updateProfileController);
