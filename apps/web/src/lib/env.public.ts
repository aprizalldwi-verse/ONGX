import { publicEnvSchema } from "./env.schema";

const raw = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_MT_SMART: process.env.NEXT_PUBLIC_MT_SMART,
  NEXT_PUBLIC_MT_PUSH: process.env.NEXT_PUBLIC_MT_PUSH,
  NEXT_PUBLIC_MT_VIGNETTE: process.env.NEXT_PUBLIC_MT_VIGNETTE,
  NEXT_PUBLIC_MT_INTERSTITIAL: process.env.NEXT_PUBLIC_MT_INTERSTITIAL,
  NEXT_PUBLIC_MT_POPUNDER: process.env.NEXT_PUBLIC_MT_POPUNDER,
  NEXT_PUBLIC_MT_REWARDED: process.env.NEXT_PUBLIC_MT_REWARDED,
  NEXT_PUBLIC_MT_NATIVE: process.env.NEXT_PUBLIC_MT_NATIVE,
} as const;

export const publicEnv = publicEnvSchema.parse(raw);
