import { EmailAlreadyExistsError, PhoneAlreadyExistsError } from '../utils/errors.js';

// Drizzle wraps PostgreSQL errors in `cause`. Translate only known constraints;
// never inspect or expose raw SQL/detail strings containing credential parameters.
export const accountDatabaseError = (error: unknown): never => {
  let current = error;
  for (let i = 0; i < 5 && current && typeof current === 'object'; i++) {
    const record = current as { code?: string; constraint?: string; cause?: unknown };
    if (record.code === '23505') {
      if (record.constraint === 'users_email_key') throw new EmailAlreadyExistsError();
      if (record.constraint === 'users_phone_key') throw new PhoneAlreadyExistsError();
    }
    current = record.cause;
  }
  throw error;
};
