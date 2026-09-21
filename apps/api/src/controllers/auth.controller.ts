import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { loginSchema } from '../utils/validators.js';
import { config } from '../config/index.js';

/**
 * Handles POST /api/v1/auth/login
 * Validates request, authenticates credentials, sets HttpOnly cookie, and returns UserSession envelope.
 */
export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedInput = loginSchema.parse(req.body);
    const { token, session } = await authService.login(validatedInput);

    // Set HttpOnly auth_token cookie
    res.cookie(config.cookie.name, token, {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: config.cookie.path,
      maxAge: config.cookie.maxAge,
    });

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}
