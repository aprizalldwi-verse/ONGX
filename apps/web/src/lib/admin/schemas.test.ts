import { describe, expect, it } from "vitest";

import {
  adminLoginSchema,
  adminReportActionSchema,
  adminTitleSchema,
  adminTriggerSchema,
} from "./schemas";

describe("adminTitleSchema", () => {
  const valid = {
    titleId: "Film Uji",
    synopsis: "Sinopsis singkat.",
    year: "2026",
    status: "LIVE",
    streamUrl: "/test/fixtures/hls/master.m3u8",
  };

  it("accepts a complete form", () => {
    expect(adminTitleSchema.parse(valid)).toEqual(valid);
  });

  it("allows an empty year", () => {
    expect(adminTitleSchema.parse({ ...valid, year: "" }).year).toBe("");
  });

  it("rejects impossible year formats", () => {
    for (const year of ["26", "1200", "20266", "2026a", "2026.5", "+2026"]) {
      expect(() => adminTitleSchema.parse({ ...valid, year }), year).toThrow();
    }
  });

  it("trims padded years", () => {
    expect(adminTitleSchema.parse({ ...valid, year: " 2026 " }).year).toBe("2026");
  });

  it("rejects unknown statuses and empty titles", () => {
    expect(() => adminTitleSchema.parse({ ...valid, status: "HIDDEN" })).toThrow();
    expect(() => adminTitleSchema.parse({ ...valid, titleId: "  " })).toThrow();
  });
});

describe("adminReportActionSchema", () => {
  it("accepts moderation statuses only", () => {
    expect(adminReportActionSchema.parse({ reportId: "r1", status: "RESOLVED" })).toEqual({
      reportId: "r1",
      status: "RESOLVED",
    });
    expect(() => adminReportActionSchema.parse({ reportId: "r1", status: "OPEN" })).not.toThrow();
    expect(() => adminReportActionSchema.parse({ reportId: "r1", status: "DELETED" })).toThrow();
  });
});

describe("adminLoginSchema", () => {
  it("trims the username but preserves the password", () => {
    expect(adminLoginSchema.parse({ username: "  admin ", password: " secret " })).toEqual({
      username: "admin",
      password: " secret ",
    });
  });

  it("rejects empty credentials and overlong passwords", () => {
    expect(() => adminLoginSchema.parse({ username: "", password: "x" })).toThrow();
    expect(() => adminLoginSchema.parse({ username: "a", password: "" })).toThrow();
    expect(() => adminLoginSchema.parse({ username: "a", password: "x".repeat(201) })).toThrow();
  });
});

describe("adminTriggerSchema", () => {
  it("accepts the three worker jobs", () => {
    for (const job of ["sync.catalog", "sync.offers", "maintenance.cleanup"]) {
      expect(adminTriggerSchema.parse({ job }).job).toBe(job);
    }
  });

  it("rejects arbitrary job names", () => {
    expect(() => adminTriggerSchema.parse({ job: "sync.everything" })).toThrow();
  });
});
