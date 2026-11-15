/**
 * Runs a single worker job in-process. Useful for ops (`docker exec`) and for
 * verifying a deployment without waiting for the next cron tick.
 *
 *   pnpm worker:once --job=maintenance.cleanup
 *   pnpm worker:once --job=sync.offers --offers-limit=10 --max-age-hours=0
 *   pnpm worker:once --job=sync.catalog --tmdb=5 --anilist=5
 */
import { prisma } from "@ongx/db";

import { loadWorkerConfig } from "@/worker/config";
import { runJob } from "@/worker/handlers";
import { JOB_NAMES, parseJobPayload, type JobName } from "@/worker/jobs";

function readArgs(): Map<string, string> {
  return new Map(
    process.argv
      .slice(2)
      .filter((arg) => arg.startsWith("--"))
      .map((arg) => {
        const [key, value] = arg.replace(/^--/, "").split("=");
        return [key ?? "", value ?? ""] as const;
      }),
  );
}

function numberArg(args: Map<string, string>, key: string, fallback: number, min: number): number {
  const parsed = Number.parseInt(args.get(key) ?? "", 10);
  return Number.isInteger(parsed) && parsed >= min ? parsed : fallback;
}

function resolveJob(name: string): JobName {
  if (
    name === JOB_NAMES.catalogSync ||
    name === JOB_NAMES.offersRefresh ||
    name === JOB_NAMES.cleanup
  ) {
    return name;
  }

  throw new Error(`Unknown job "${name}". Expected one of: ${Object.values(JOB_NAMES).join(", ")}`);
}

async function main(): Promise<void> {
  const args = readArgs();
  const rawJob = args.get("job");
  if (!rawJob) {
    throw new Error("Pass --job=<name>. Available: " + Object.values(JOB_NAMES).join(", "));
  }

  const name = resolveJob(rawJob);
  const config = loadWorkerConfig();

  const payload = parseJobPayload(name, {
    ...(name === JOB_NAMES.catalogSync
      ? {
          tmdb: numberArg(args, "tmdb", config.catalog.tmdb, 1),
          anilist: numberArg(args, "anilist", config.catalog.anilist, 1),
          force: args.has("force") || config.catalog.force,
          region: config.catalog.region,
        }
      : {}),
    ...(name === JOB_NAMES.offersRefresh
      ? {
          limit: numberArg(args, "offers-limit", config.offers.limit, 1),
          maxAgeHours: numberArg(args, "max-age-hours", config.offers.maxAgeHours, 0),
          region: config.offers.region,
        }
      : {}),
    ...(name === JOB_NAMES.cleanup
      ? { retentionDays: numberArg(args, "retention-days", config.retentionDays, 0) }
      : {}),
  });

  console.log(`[worker:once] running ${name}`, payload);
  const result = await runJob(name, payload, { jobId: undefined, attemptsMade: 0 });
  console.log("[worker:once] done", result);
}

main()
  .catch((error: unknown) => {
    console.error("[worker:once] fatal", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
