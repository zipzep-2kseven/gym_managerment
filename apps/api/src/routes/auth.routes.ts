import { Router } from 'express';
import {
  registerController,
  loginController,
  getMeController,
  logoutController,
  changePasswordController,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { createLoginRateLimit } from '../middleware/login-rate-limit.js';

export const authRouter = Router();

/**
 * FEAT-AUTH-001: Customer Registration
 * POST /api/v1/auth/register
 */
authRouter.post('/register', registerController);

/**
 * FEAT-AUTH-002: User Login
 * POST /api/v1/auth/login
 */
authRouter.post('/login', createLoginRateLimit(), loginController);

/**
 * FEAT-AUTH-003: User Logout
 * POST /api/v1/auth/logout
 */
authRouter.post('/logout', logoutController);

/**
 * FEAT-AUTH-004: Current User Session
 * GET /api/v1/auth/me
 */
authRouter.get('/me', authenticate, getMeController);

/**
 * FEAT-AUTH-006: Change Password
 * POST /api/v1/auth/change-password
 */
authRouter.post('/change-password', authenticate, changePasswordController);
