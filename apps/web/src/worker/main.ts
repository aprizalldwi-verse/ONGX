import { prisma } from "@ongx/db";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";

import { runJob, type JobContext, type JobResult } from "./handlers";
import { loadWorkerConfig, WorkerConfigError, type WorkerConfig } from "./config";
import { DEFAULT_JOB_OPTIONS, QUEUE_NAME, scheduleDefinitions, type JobName } from "./jobs";

/**
 * Long-running Phase 9 worker. One process registers the repeatable schedules
 * and consumes them; scale horizontally by running more replicas (BullMQ
 * guarantees a single execution per job).
 *
 * Start with `pnpm worker` (loads `apps/web/.env.local`).
 */

function connection(config: WorkerConfig) {
  return { url: config.redisUrl };
}

function isJobName(value: string): value is JobName {
  return value === "sync.catalog" || value === "sync.offers" || value === "maintenance.cleanup";
}

async function main(): Promise<void> {
  const config = loadWorkerConfig();
  const redis = new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });
  redis.on("error", (error: Error) => {
    console.error("[worker:redis]", error.message);
  });

  const queue = new Queue(QUEUE_NAME, {
    connection: connection(config),
    prefix: config.queuePrefix,
  });

  const worker = new Worker(
    QUEUE_NAME,
    async (job): Promise<JobResult> => {
      if (!isJobName(job.name)) {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      const context: JobContext = { jobId: job.id, attemptsMade: job.attemptsMade };
      console.log(`[worker] ${job.name} start id=${job.id ?? "-"} attempt=${job.attemptsMade + 1}`);

      try {
        const result = await runJob(job.name, job.data, context);
        console.log(`[worker] ${job.name} done id=${job.id ?? "-"}`, result);
        return result;
      } catch (error) {
        console.error(`[worker] ${job.name} failed id=${job.id ?? "-"}`, error);
        throw error;
      }
    },
    {
      connection: connection(config),
      concurrency: config.concurrency,
      prefix: config.queuePrefix,
    },
  );

  worker.on("error", (error) => {
    console.error("[worker:queue]", error.message);
  });

  for (const definition of scheduleDefinitions(config)) {
    await queue.upsertJobScheduler(
      definition.schedulerId,
      { pattern: definition.pattern },
      { name: definition.name, data: definition.payload, opts: { ...DEFAULT_JOB_OPTIONS } },
    );
    console.log(`[worker] scheduled ${definition.name} (${definition.pattern})`);
  }

  const heartbeatTtl = Math.max(config.heartbeatMs * 3, 30_000);

  const beat = async (): Promise<void> => {
    try {
      if (redis.status === "wait") await redis.connect();
      await redis.set(config.healthKey, new Date().toISOString(), "PX", heartbeatTtl);
    } catch (error) {
      console.error("[worker] heartbeat failed", error);
    }
  };

  await beat();
  const heartbeat = setInterval(() => {
    void beat();
  }, config.heartbeatMs);

  let stopping = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    console.log(`[worker] ${signal} received; draining`);

    clearInterval(heartbeat);

    try {
      // `close()` waits for active jobs; the queue then stops handing out work.
      await worker.close();
      await queue.close();
    } finally {
      await redis.del(config.healthKey).catch(() => 0);
      await redis.quit().catch(() => "OK");
      await prisma.$disconnect();
    }

    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[worker] unhandled rejection", reason);
  });

  console.log(
    `[worker] ready queue=${QUEUE_NAME} prefix=${config.queuePrefix} concurrency=${config.concurrency}`,
  );
}

main().catch(async (error: unknown) => {
  if (error instanceof WorkerConfigError) {
    console.error(error.message);
  } else {
    console.error("[worker] fatal", error);
  }

  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
