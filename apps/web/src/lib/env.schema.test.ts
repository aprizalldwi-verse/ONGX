import { describe, expect, it } from "vitest";

import { checkEnv, publicEnvSchema, serverEnvSchema } from "./env.schema";

const validServer = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
};

describe("serverEnvSchema", () => {
  it("accepts a minimal valid environment", () => {
    const parsed = serverEnvSchema.parse(validServer);
    expect(parsed.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
    expect(parsed.TMDB_REGION).toBe("ID");
    expect(parsed.ADMIN_USER).toBe("admin");
  });

  it("treats empty strings as undefined", () => {
    const parsed = serverEnvSchema.parse({ ...validServer, TMDB_API_KEY: "" });
    expect(parsed.TMDB_API_KEY).toBeUndefined();
  });

  it("rejects an unknown NODE_ENV", () => {
    const result = serverEnvSchema.safeParse({ ...validServer, NODE_ENV: "staging" });
    expect(result.success).toBe(false);
  });
});

describe("publicEnvSchema", () => {
  it("requires an absolute site URL", () => {
    expect(publicEnvSchema.safeParse({ NEXT_PUBLIC_SITE_URL: "not-a-url" }).success).toBe(false);
    expect(
      publicEnvSchema.safeParse({ NEXT_PUBLIC_SITE_URL: "https://ongx.example" }).success,
    ).toBe(true);
  });
});

describe("checkEnv", () => {
  it("reports the failing key by name", () => {
    const result = checkEnv(publicEnvSchema, {});
    expect(result.ok).toBe(false);
    expect(result.message).toContain("NEXT_PUBLIC_SITE_URL");
  });

  it("passes for a valid environment", () => {
    const result = checkEnv(publicEnvSchema, { NEXT_PUBLIC_SITE_URL: "https://ongx.example" });
    expect(result).toEqual({ ok: true });
  });
});
