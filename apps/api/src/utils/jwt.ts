import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { JwtPayload } from '../types/auth.types.js';

/**
 * Signs a JSON Web Token with standardized claims: sub, email, roles.
 * Never includes sensitive credentials (password, password_hash, salts).
 */
export function signJwt(payload: { sub: string; email: string; roles: string[] }): string {
  return jwt.sign(payload, config.jwt.secret, {
    algorithm: 'HS256',
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Verifies and decodes a signed JWT string.
 */
export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as JwtPayload;
}
