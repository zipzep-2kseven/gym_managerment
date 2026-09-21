export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(statusCode: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác.');
  }
}

export class AccountDeactivatedError extends AppError {
  constructor() {
    super(403, 'ACCOUNT_DEACTIVATED', 'Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa.');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dữ liệu yêu cầu không hợp lệ.', details: unknown = null) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}
