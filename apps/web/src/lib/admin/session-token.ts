import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin session tokens. Stateless and dependency-free: the token carries the
 * username and expiry, signed with HMAC-SHA256. Keeping the crypto here (pure)
 * means the login/logout plumbing in `auth.ts` cannot drift from what the tests
 * verify.
 */

export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
export const MIN_ADMIN_SESSION_SECRET_LENGTH = 32;

const TOKEN_VERSION = "v1";
const MAX_USERNAME_LENGTH = 64;

export interface AdminSession {
  username: string;
  /** Unix epoch in milliseconds. */
  expiresAt: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signature(version: string, payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`${version}.${payload}`).digest("base64url");
}

export function createSessionToken(session: AdminSession, secret: string): string {
  if (secret.length < MIN_ADMIN_SESSION_SECRET_LENGTH) {
    throw new Error("Admin session secret is too short");
  }

  if (session.username.length === 0 || session.username.length > MAX_USERNAME_LENGTH) {
    throw new Error("Invalid admin username");
  }

  const payload = base64url(
    JSON.stringify({ u: session.username, e: Math.trunc(session.expiresAt) }),
  );

  return `${TOKEN_VERSION}.${payload}.${signature(TOKEN_VERSION, payload, secret)}`;
}

/**
 * Returns the session only when the signature matches and the token is still
 * valid. Any malformed input is treated as "not signed in"; callers redirect.
 */
export function verifySessionToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): AdminSession | null {
  if (secret.length < MIN_ADMIN_SESSION_SECRET_LENGTH) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, payload, provided] = parts;
  if (version !== TOKEN_VERSION || !payload || !provided) return null;

  const expected = signature(version, payload, secret);
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const username = record["u"];
  const expiresAt = record["e"];

  if (
    typeof username !== "string" ||
    username.length === 0 ||
    username.length > MAX_USERNAME_LENGTH
  ) {
    return null;
  }
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return null;
  if (expiresAt <= now) return null;

  return { username, expiresAt };
}

export type SessionSecretSource = "env" | "password-hash";

export type SessionSecretResult =
  | { ok: true; secret: string; source: SessionSecretSource }
  | { ok: false; reason: "missing" | "too-short" };

const MISSING: SessionSecretResult = { ok: false, reason: "missing" };

/**
 * Prefers an explicit `ADMIN_SESSION_SECRET`. Older deployments that only have
 * `ADMIN_PASS_HASH` keep working by signing with the bcrypt hash, which is
 * already high-entropy and invalidates sessions when the password changes.
 */
export function resolveSessionSecret(
  input: Record<string, string | undefined>,
): SessionSecretResult {
  const explicit = input["ADMIN_SESSION_SECRET"]?.trim();
  if (explicit) {
    if (explicit.length < MIN_ADMIN_SESSION_SECRET_LENGTH) {
      return { ok: false, reason: "too-short" };
    }
    return { ok: true, secret: explicit, source: "env" };
  }

  const passwordHash = input["ADMIN_PASS_HASH"]?.trim();
  if (passwordHash && passwordHash.length >= MIN_ADMIN_SESSION_SECRET_LENGTH) {
    return { ok: true, secret: passwordHash, source: "password-hash" };
  }

  return MISSING;
}
