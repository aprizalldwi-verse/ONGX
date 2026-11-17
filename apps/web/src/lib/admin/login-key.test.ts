import { describe, expect, it } from "vitest";

import { adminLoginIdentityKey } from "./login-key";

describe("adminLoginIdentityKey", () => {
  it("normalizes case and padding", () => {
    expect(adminLoginIdentityKey("  Admin ")).toBe(adminLoginIdentityKey("admin"));
    expect(adminLoginIdentityKey("ADMIN")).toBe(adminLoginIdentityKey("admin"));
  });

  it("keeps different usernames in different buckets", () => {
    expect(adminLoginIdentityKey("admin")).not.toBe(adminLoginIdentityKey("root"));
  });

  it("hashes the username instead of storing it in Redis", () => {
    const key = adminLoginIdentityKey("admin");
    const prefix = "ongx:admin:login:user:";

    expect(key.startsWith(prefix)).toBe(true);
    expect(key.slice(prefix.length)).not.toContain("admin");
    expect(key).toHaveLength(prefix.length + 64);
  });
});
