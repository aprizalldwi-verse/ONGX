import "server-only";

import { DEFAULT_JOB_OPTIONS, QUEUE_NAME, scheduleDefinitions, type JobName } from "@/worker/jobs";
import { loadWorkerConfig } from "@/worker/config";

/**
 * Enqueues a one-off run of a scheduled job. The payload and retry policy come
 * from the same contract the cron schedulers use, so an admin-triggered run is
 * indistinguishable from a scheduled one except for its id.
 *
 * `bullmq` is imported dynamically: the admin panel is the only web route that
 * needs it, and this keeps it out of the shared server bundle.
 */

export interface EnqueuedJob {
  name: JobName;
  jobId: string | null;
}

export async function enqueueAdminJob(name: JobName): Promise<EnqueuedJob> {
  const config = loadWorkerConfig(process.env);
  const definition = scheduleDefinitions(config).find((item) => item.name === name);

  if (!definition) {
    throw new Error(`No worker schedule is defined for ${name}`);
  }

  const { Queue } = await import("bullmq");
  const queue = new Queue(QUEUE_NAME, {
    connection: { url: config.redisUrl },
    prefix: config.queuePrefix,
  });

  try {
    const job = await queue.add(name, definition.payload, { ...DEFAULT_JOB_OPTIONS });
    return { name, jobId: job.id ?? null };
  } finally {
    await queue.close();
  }
}
