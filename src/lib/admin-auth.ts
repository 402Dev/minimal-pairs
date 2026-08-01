import { createHash, timingSafeEqual } from "crypto";

/**
 * Lightweight session scheme for the hidden /admin panel: not bank-grade,
 * but enough to keep a single-operator internal tool away from casual
 * visitors. The cookie value is a deterministic hash of the admin
 * password, so there's no session store to manage — checking the cookie
 * is just re-deriving the same hash and comparing.
 */
export const ADMIN_SESSION_COOKIE = "minpair_admin_session";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const isAdminConfigured = Boolean(ADMIN_PASSWORD);

function sessionToken(password: string): string {
  return createHash("sha256").update(`minpair-admin:${password}`).digest("hex");
}

/** The value to store in the session cookie after a successful login. */
export function createAdminSessionToken(): string | null {
  if (!ADMIN_PASSWORD) return null;
  return sessionToken(ADMIN_PASSWORD);
}

/** Checks a plaintext password against the configured admin password. */
export function verifyAdminPassword(candidate: string): boolean {
  if (!ADMIN_PASSWORD || !candidate) return false;
  const expected = Buffer.from(ADMIN_PASSWORD);
  const actual = Buffer.from(candidate);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Checks a session cookie value against the expected derived token. */
export function verifyAdminSessionToken(candidate: string | undefined): boolean {
  if (!ADMIN_PASSWORD || !candidate) return false;
  const expected = Buffer.from(sessionToken(ADMIN_PASSWORD));
  const actual = Buffer.from(candidate);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Convenience guard for /api/admin/* route handlers: reads the session
 * cookie straight off the incoming request (no need for next/headers).
 */
export function isAuthorizedAdminRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = match?.slice(ADMIN_SESSION_COOKIE.length + 1);
  return verifyAdminSessionToken(token ? decodeURIComponent(token) : undefined);
}
