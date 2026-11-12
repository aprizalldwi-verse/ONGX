import { describe, expect, it } from "vitest";

import { buildHealthReport, healthStatusCode } from "./health";

const now = new Date("2026-01-02T03:04:05.000Z");

describe("buildHealthReport", () => {
  it("is ok when every dependency is up", () => {
    const report = buildHealthReport({ database: "up", redis: "up", now });
    expect(report.status).toBe("ok");
    expect(report.timestamp).toBe("2026-01-02T03:04:05.000Z");
    expect(healthStatusCode(report.status)).toBe(200);
  });

  it("is degraded when a dependency is not configured", () => {
    expect(buildHealthReport({ database: "up", redis: "disabled", now }).status).toBe("degraded");
    expect(buildHealthReport({ database: "disabled", redis: "disabled", now }).status).toBe(
      "degraded",
    );
  });

  it("is down when any dependency reports down", () => {
    const report = buildHealthReport({ database: "down", redis: "up", now });
    expect(report.status).toBe("down");
    expect(healthStatusCode(report.status)).toBe(503);
    expect(buildHealthReport({ database: "up", redis: "down", now }).status).toBe("down");
  });
});
