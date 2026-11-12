import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_MT_SMART: optionalString,
  NEXT_PUBLIC_MT_PUSH: optionalString,
  NEXT_PUBLIC_MT_VIGNETTE: optionalString,
  NEXT_PUBLIC_MT_INTERSTITIAL: optionalString,
  NEXT_PUBLIC_MT_POPUNDER: optionalString,
  NEXT_PUBLIC_MT_REWARDED: optionalString,
  NEXT_PUBLIC_MT_NATIVE: optionalString,
});

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: optionalString,
  DIRECT_URL: optionalString,
  REDIS_URL: optionalString,
  TMDB_API_KEY: optionalString,
  TMDB_REGION: z.string().default("ID"),
  CRON_SECRET: optionalString,
  ADMIN_USER: z.string().default("admin"),
  ADMIN_PASS_HASH: optionalString,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

export interface EnvResult {
  ok: boolean;
  message?: string;
}

export function checkEnv(schema: z.ZodType, input: Record<string, string | undefined>): EnvResult {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true };

  const lines = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `  - ${path}: ${issue.message}`;
  });

  return {
    ok: false,
    message: `Invalid environment variables:\n${lines.join("\n")}\n\nSee .env.example for the full list.`,
  };
}
