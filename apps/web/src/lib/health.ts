export type ProbeState = "up" | "down" | "disabled";
export type HealthStatus = "ok" | "degraded" | "down";

export interface HealthReport {
  status: HealthStatus;
  checks: {
    database: ProbeState;
    redis: ProbeState;
    /** Present only when the worker heartbeat is part of the contract. */
    worker?: ProbeState;
  };
  timestamp: string;
}

export interface HealthInput {
  database: ProbeState;
  redis: ProbeState;
  /**
   * Worker heartbeat state. Omit when the deployment does not run the worker
   * so a web-only install keeps reporting `ok`.
   */
  worker?: ProbeState;
  now?: Date;
}

/** Pure so it can be unit tested without a database or Redis. */
export function buildHealthReport(input: HealthInput): HealthReport {
  const required: ProbeState[] = [input.database, input.redis];

  // A missing worker degrades the report but never takes the web tier down:
  // pages still render, they just stop receiving fresh catalogue data.
  const status: HealthStatus = required.includes("down")
    ? "down"
    : required.includes("disabled") || input.worker === "down" || input.worker === "disabled"
      ? "degraded"
      : "ok";

  return {
    status,
    checks: {
      database: input.database,
      redis: input.redis,
      ...(input.worker !== undefined ? { worker: input.worker } : {}),
    },
    timestamp: (input.now ?? new Date()).toISOString(),
  };
}

export function healthStatusCode(status: HealthStatus): 200 | 503 {
  return status === "down" ? 503 : 200;
}
