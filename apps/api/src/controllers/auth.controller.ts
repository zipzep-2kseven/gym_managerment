import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { loginSchema, changePasswordSchema, registerSchema } from '../utils/validators.js';
import { UnauthorizedError } from '../utils/errors.js';
import { config } from '../config/index.js';

/**
 * Handles POST /api/v1/auth/register
 * Validates request, creates Customer user within transaction, sets HttpOnly cookie,
 * and returns HTTP 201 Created with UserSession envelope.
 */
export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validatedInput = registerSchema.parse(req.body);
    const { token, session } = await authService.register(validatedInput);

    // Set HttpOnly auth_token cookie
    res.cookie(config.cookie.name, token, {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: config.cookie.path,
      maxAge: config.cookie.maxAge,
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

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

/**
 * Handles GET /api/v1/auth/me
 * Retrieves authoritative UserSession projection directly from database for authenticated user.
 */
export async function getMeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError();
    }

    const session = await authService.getCurrentUser(req.user.userId);

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles POST /api/v1/auth/logout
 * Clears the auth_token cookie with Max-Age=0, Path=/api/v1, HttpOnly, Secure, SameSite=Lax.
 * Safe and idempotent: succeeds whether or not user had an active session cookie.
 */
export async function logoutController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.cookie(config.cookie.name, '', {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: config.cookie.path,
      maxAge: 0,
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Đăng xuất thành công.',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles POST /api/v1/auth/change-password
 * Authenticated endpoint for changing user password.
 * Identity is strictly derived from authenticated context (req.user.userId).
 */
export async function changePasswordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError();
    }

    const validatedInput = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(req.user.userId, validatedInput);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
