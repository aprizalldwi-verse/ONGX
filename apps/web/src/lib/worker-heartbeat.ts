import "server-only";

import { getRedis } from "./redis";

/**
 * Reads the worker heartbeat shared by `/api/health` and the admin dashboard.
 * The worker refreshes `ongx:worker:heartbeat` every 15 s with a 45 s TTL, so a
 * missing key means the process stopped more than a few seconds ago.
 */

export type WorkerHeartbeatState = "up" | "down" | "disabled";

export interface WorkerHeartbeat {
  state: WorkerHeartbeatState;
  /** ISO timestamp written by the worker, or `null` when absent. */
  at: string | null;
  key: string;
}

export function workerHealthKey(): string {
  const configured = process.env.WORKER_HEALTH_KEY?.trim();
  return configured && configured.length > 0 ? configured : "ongx:worker:heartbeat";
}

export async function readWorkerHeartbeat(): Promise<WorkerHeartbeat> {
  const key = workerHealthKey();
  const redis = getRedis();
  if (!redis) return { state: "disabled", at: null, key };

  try {
    if (redis.status === "wait") await redis.connect();
    const at = await redis.get(key);
    return { state: at ? "up" : "down", at, key };
  } catch (error) {
    console.error("[worker-heartbeat]", error);
    return { state: "down", at: null, key };
  }
}
