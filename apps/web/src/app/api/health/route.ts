import { NextResponse } from "next/server";

import { buildHealthReport, healthStatusCode, type ProbeState } from "@/lib/health";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function probeDatabase(): Promise<ProbeState> {
  if (!process.env.DATABASE_URL) return "disabled";

  try {
    await prisma.$queryRaw`SELECT 1`;
    return "up";
  } catch (error) {
    console.error("[health] database", error);
    return "down";
  }
}

async function probeRedis(): Promise<ProbeState> {
  const redis = getRedis();
  if (!redis) return "disabled";

  try {
    if (redis.status === "wait") await redis.connect();
    const pong = await redis.ping();
    return pong === "PONG" ? "up" : "down";
  } catch (error) {
    console.error("[health] redis", error);
    return "down";
  }
}

async function probeWorker(redis: ReturnType<typeof getRedis>): Promise<ProbeState> {
  if (!redis) return "disabled";

  try {
    if (redis.status === "wait") await redis.connect();
    const key = process.env.WORKER_HEALTH_KEY?.trim() || "ongx:worker:heartbeat";
    const heartbeat = await redis.get(key);
    return heartbeat ? "up" : "down";
  } catch (error) {
    console.error("[health] worker", error);
    return "down";
  }
}

export async function GET() {
  const [database, redis] = await Promise.all([probeDatabase(), probeRedis()]);
  const workerRequired = process.env.WORKER_HEALTH_REQUIRED === "true";
  const worker = workerRequired ? await probeWorker(getRedis()) : undefined;
  const report = buildHealthReport({
    database,
    redis,
    ...(worker !== undefined ? { worker } : {}),
  });

  return NextResponse.json(report, {
    status: healthStatusCode(report.status),
    headers: { "cache-control": "no-store" },
  });
}
