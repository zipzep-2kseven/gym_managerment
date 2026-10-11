/**
 * Valid pre-computed Argon2id hash used for dummy password verification
 * when a user is not found by email. This uses the same work parameters as real passwords
 * to reduce timing differences; it does not guarantee constant request latency.
 */
export const DUMMY_ARGON2_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$/kBWxNd+eiDxME1Fsx81qQ$PXVp19M9VpxWS/KLYIb/Y9mNvxc8MOxl+SDFLji9vHA";

export const AUTH_COOKIE_NAME = 'auth_token';
export const AUTH_COOKIE_PATH = '/api/v1';
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 604800000 ms (7 days)
export const AUTH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds
