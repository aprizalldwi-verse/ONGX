import { describe, expect, it } from "vitest";

import {
  ADMIN_SESSION_TTL_SECONDS,
  createSessionToken,
  MIN_ADMIN_SESSION_SECRET_LENGTH,
  resolveSessionSecret,
  verifySessionToken,
} from "./session-token";

const SECRET = "a".repeat(MIN_ADMIN_SESSION_SECRET_LENGTH);
const NOW = 1_800_000_000_000;

describe("admin session tokens", () => {
  it("round-trips a valid session", () => {
    const session = { username: "admin", expiresAt: NOW + ADMIN_SESSION_TTL_SECONDS * 1_000 };
    const token = createSessionToken(session, SECRET);

    expect(token.startsWith("v1.")).toBe(true);
    expect(verifySessionToken(token, SECRET, NOW)).toEqual(session);
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken({ username: "admin", expiresAt: NOW + 60_000 }, SECRET);
    const [version, payload, signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ u: "root", e: NOW + 60_000 })).toString(
      "base64url",
    );

    expect(verifySessionToken(`${version}.${forgedPayload}.${signature}`, SECRET, NOW)).toBeNull();
    expect(payload).toBeDefined();
  });

  it("rejects a token signed with another secret", () => {
    const token = createSessionToken({ username: "admin", expiresAt: NOW + 60_000 }, SECRET);

    expect(verifySessionToken(token, "b".repeat(MIN_ADMIN_SESSION_SECRET_LENGTH), NOW)).toBeNull();
  });

  it("rejects expired tokens (expiry is exclusive)", () => {
    const token = createSessionToken({ username: "admin", expiresAt: NOW }, SECRET);

    expect(verifySessionToken(token, SECRET, NOW)).toBeNull();
    expect(verifySessionToken(token, SECRET, NOW - 1)).not.toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    expect(verifySessionToken("", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("v1", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("v1..", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("v2.payload.sig", SECRET, NOW)).toBeNull();
    expect(verifySessionToken("v1.not-json.sig", SECRET, NOW)).toBeNull();
  });

  it("refuses to sign with a short secret or an empty username", () => {
    expect(() => createSessionToken({ username: "admin", expiresAt: NOW }, "short")).toThrow();
    expect(() => createSessionToken({ username: "", expiresAt: NOW }, SECRET)).toThrow();
    expect(() =>
      createSessionToken({ username: "x".repeat(65), expiresAt: NOW }, SECRET),
    ).toThrow();
  });
});

describe("resolveSessionSecret", () => {
  it("prefers an explicit secret", () => {
    expect(
      resolveSessionSecret({
        ADMIN_SESSION_SECRET: SECRET,
        ADMIN_PASS_HASH: "$2b$12$" + "x".repeat(53),
      }),
    ).toEqual({ ok: true, secret: SECRET, source: "env" });
  });

  it("rejects an explicit secret that is too short", () => {
    expect(resolveSessionSecret({ ADMIN_SESSION_SECRET: "short" })).toEqual({
      ok: false,
      reason: "too-short",
    });
  });

  it("falls back to the bcrypt hash so existing deployments keep working", () => {
    const hash = "$2b$12$" + "x".repeat(53);
    expect(resolveSessionSecret({ ADMIN_PASS_HASH: hash })).toEqual({
      ok: true,
      secret: hash,
      source: "password-hash",
    });
  });

  it("reports missing configuration", () => {
    expect(resolveSessionSecret({})).toEqual({ ok: false, reason: "missing" });
    expect(resolveSessionSecret({ ADMIN_PASS_HASH: "short-hash" })).toEqual({
      ok: false,
      reason: "missing",
    });
  });
});
