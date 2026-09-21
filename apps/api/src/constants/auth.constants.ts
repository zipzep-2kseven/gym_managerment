/**
 * Valid pre-computed Argon2id hash used for dummy password verification
 * when a user is not found by email. This guarantees constant-time execution
 * and protects against user enumeration and timing side-channel attacks.
 */
export const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$aw5+yzrqJLCApYviUaYmdA$JBjXHn6yVgfEG6zHfSZm2QD6YhDbevgyVwbpE0/WwkQ';

export const AUTH_COOKIE_NAME = 'auth_token';
export const AUTH_COOKIE_PATH = '/api/v1';
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 604800000 ms (7 days)
export const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds
