import { createHash } from "node:crypto";

/**
 * Redis key for the per-username login budget. Hashing keeps raw usernames out
 * of Redis dumps and makes the key independent of casing/padding.
 */
export function adminLoginIdentityKey(username: string): string {
  const normalized = username.trim().toLowerCase();
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `ongx:admin:login:user:${digest}`;
}
