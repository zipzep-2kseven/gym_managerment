import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. AppError (Domain & Custom Errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // 2. Zod Validation Error (compatible with Zod issues)
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu yêu cầu không hợp lệ.',
        details,
      },
    });
    return;
  }

  // 3. Fallback for unhandled internal server errors
  // We intentionally do NOT log raw passwords or request bodies containing credentials
  console.error('[UNHANDLED_ERROR]:', err.message);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Lỗi nội bộ hệ thống.',
      details: null,
    },
  });
};
