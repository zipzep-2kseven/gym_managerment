import { Router } from 'express';
import { loginController } from '../controllers/auth.controller.js';

export const authRouter = Router();

/**
 * FEAT-AUTH-002: User Login
 * POST /api/v1/auth/login
 */
authRouter.post('/login', loginController);
