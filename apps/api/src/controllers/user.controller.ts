import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { updateProfileSchema } from '../utils/validators.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Handles GET /api/v1/users/me/profile
 * Retrieves UserProfileView { phone, profile } for authenticated user.
 */
export async function getProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError();
    }

    const data = await userService.getProfile(req.user.userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles PATCH /api/v1/users/me/profile
 * Validates request body, updates phone and/or profile, and returns updated UserProfileView.
 */
export async function updateProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError();
    }

    const validatedInput = updateProfileSchema.parse(req.body);
    const data = await userService.updateProfile(req.user.userId, validatedInput);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
