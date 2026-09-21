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

export class UnauthorizedError extends AppError {
  constructor(message = 'Yêu cầu đăng nhập để truy cập tài nguyên này.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class InvalidCurrentPasswordError extends AppError {
  constructor(message = 'Mật khẩu hiện tại không chính xác.') {
    super(400, 'INVALID_CREDENTIALS', message);
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(message = 'Email này đã được sử dụng.') {
    super(409, 'EMAIL_ALREADY_EXISTS', message);
  }
}

export class PhoneAlreadyExistsError extends AppError {
  constructor(message = 'Số điện thoại này đã được sử dụng.') {
    super(409, 'PHONE_ALREADY_EXISTS', message);
  }
}

