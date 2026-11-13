import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

/**
 * Single Prisma client per process. In dev, Next reloads modules on every edit;
 * caching on `globalThis` avoids exhausting the connection pool.
 *
 * The interactive transaction budget is raised from the 5 s default because
 * `upsertTitle` touches dozens of people/genres for cast-heavy titles and can
 * exceed it on a cold database, which failed the catalog sync (ASUMSI-035).
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
