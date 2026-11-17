import "server-only";

import { checkEnv, serverEnvSchema } from "./env.schema";

const raw = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  REDIS_URL: process.env.REDIS_URL,
  TMDB_API_KEY: process.env.TMDB_API_KEY,
  TMDB_REGION: process.env.TMDB_REGION,
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_USER: process.env.ADMIN_USER,
  ADMIN_PASS_HASH: process.env.ADMIN_PASS_HASH,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  CSP_EXTRA_ORIGINS: process.env.CSP_EXTRA_ORIGINS,
} as const;

const check = checkEnv(serverEnvSchema, raw);

if (!check.ok) {
  throw new Error(check.message ?? "Invalid server environment");
}

export const env = serverEnvSchema.parse(raw);
