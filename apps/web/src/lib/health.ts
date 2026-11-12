export type ProbeState = "up" | "down" | "disabled";
export type HealthStatus = "ok" | "degraded" | "down";

export interface HealthReport {
  status: HealthStatus;
  checks: {
    database: ProbeState;
    redis: ProbeState;
  };
  timestamp: string;
}

export interface HealthInput {
  database: ProbeState;
  redis: ProbeState;
  now?: Date;
}

/** Pure so it can be unit tested without a database or Redis. */
export function buildHealthReport(input: HealthInput): HealthReport {
  const states: ProbeState[] = [input.database, input.redis];
  const status: HealthStatus = states.includes("down")
    ? "down"
    : states.includes("disabled")
      ? "degraded"
      : "ok";

  return {
    status,
    checks: { database: input.database, redis: input.redis },
    timestamp: (input.now ?? new Date()).toISOString(),
  };
}

export function healthStatusCode(status: HealthStatus): 200 | 503 {
  return status === "down" ? 503 : 200;
}
