import { describe, expect, it } from "vitest";

import { reportSchema } from "./report-schema";

describe("reportSchema", () => {
  it("accepts a minimal report", () => {
    const parsed = reportSchema.parse({ reason: "broken" });
    expect(parsed).toEqual({
      titleId: null,
      reason: "broken",
      message: null,
      contact: null,
    });
  });

  it("normalizes empty strings to null", () => {
    const parsed = reportSchema.parse({
      reason: "metadata",
      titleId: "",
      message: "   ",
      contact: "",
    });

    expect(parsed.titleId).toBeNull();
    expect(parsed.message).toBeNull();
    expect(parsed.contact).toBeNull();
  });

  it("keeps a valid email and message", () => {
    const parsed = reportSchema.parse({
      reason: "unavailable",
      titleId: "clx123",
      message: "Provider link is dead",
      contact: "viewer@example.com",
    });

    expect(parsed.contact).toBe("viewer@example.com");
    expect(parsed.message).toBe("Provider link is dead");
    expect(parsed.titleId).toBe("clx123");
  });

  it("rejects unknown reasons", () => {
    expect(reportSchema.safeParse({ reason: "spam" }).success).toBe(false);
  });

  it("rejects malformed emails", () => {
    expect(reportSchema.safeParse({ reason: "other", contact: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("rejects overlong messages", () => {
    expect(reportSchema.safeParse({ reason: "other", message: "x".repeat(1_001) }).success).toBe(
      false,
    );
  });

  it("rejects unknown keys", () => {
    expect(reportSchema.safeParse({ reason: "other", admin: true }).success).toBe(false);
  });
});
