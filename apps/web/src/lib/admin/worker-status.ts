import "server-only";

import { readWorkerHeartbeat, type WorkerHeartbeat } from "@/lib/worker-heartbeat";

/**
 * Admin read model for the worker's Redis heartbeat. The worker writes an ISO
 * timestamp with a TTL; a missing key means "not running" (or not deployed).
 */

export type AdminWorkerState = "up" | "down" | "disabled";

export interface AdminWorkerStatus {
  state: AdminWorkerState;
  lastBeat: string | null;
  key: string;
}

export async function getWorkerStatus(): Promise<AdminWorkerStatus> {
  const heartbeat: WorkerHeartbeat = await readWorkerHeartbeat();

  return {
    state: heartbeat.state === "up" ? "up" : heartbeat.state === "disabled" ? "disabled" : "down",
    lastBeat: heartbeat.at,
    key: heartbeat.key,
  };
}
