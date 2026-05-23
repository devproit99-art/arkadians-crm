/** Shared with seed + login (legacy migration). */
export const SEED_USER_PASSWORD = "Welcome1!";

/** Old seed stored this string instead of a bcrypt hash — login upgrades it on first success. */
export const LEGACY_PASSWORD_HASH_PLACEHOLDER = "dev-only-not-for-production-auth";
