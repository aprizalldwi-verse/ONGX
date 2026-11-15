import type { AdSlotVariant } from "@/lib/ads";

/**
 * Single source of truth for ad zones. Components never hardcode a zone id:
 * they ask `AD_ZONES` (or a helper here) and receive `enabled`/`zoneId`.
 *
 * Zone ids come only from env, so a build with every `NEXT_PUBLIC_MT_*` empty
 * (and/or `NEXT_PUBLIC_ADS_ENABLED=false`) renders no ad surface at all.
 *
 * `process.env.NEXT_PUBLIC_*` is read directly (instead of through
 * `lib/env.public`) because this module is imported by client components and
 * pulling Zod into that bundle would be wasteful. `env.schema.ts` still
 * validates the same keys on the server.
 */

function clean(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function flag(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

/** Master switch. `false`/missing keeps every zone disabled. */
export const ADS_ENABLED: boolean = flag(process.env.NEXT_PUBLIC_ADS_ENABLED);

export const AD_ZONE_KEYS = [
  "smartTag",
  "inPagePush",
  "vignette",
  "interstitial",
  "popunder",
  "rewarded",
  "native",
] as const;

export type AdZoneKey = (typeof AD_ZONE_KEYS)[number];

export interface AdZone {
  readonly key: AdZoneKey;
  readonly enabled: boolean;
  readonly zoneId: string | undefined;
}

function createZone(key: AdZoneKey, zoneId: string | undefined): AdZone {
  return {
    key,
    enabled: ADS_ENABLED && zoneId !== undefined,
    zoneId,
  };
}

export const AD_ZONES = {
  smartTag: createZone("smartTag", clean(process.env.NEXT_PUBLIC_MT_SMART)),
  inPagePush: createZone("inPagePush", clean(process.env.NEXT_PUBLIC_MT_PUSH)),
  vignette: createZone("vignette", clean(process.env.NEXT_PUBLIC_MT_VIGNETTE)),
  interstitial: createZone("interstitial", clean(process.env.NEXT_PUBLIC_MT_INTERSTITIAL)),
  popunder: createZone("popunder", clean(process.env.NEXT_PUBLIC_MT_POPUNDER)),
  rewarded: createZone("rewarded", clean(process.env.NEXT_PUBLIC_MT_REWARDED)),
  native: createZone("native", clean(process.env.NEXT_PUBLIC_MT_NATIVE)),
} satisfies Record<AdZoneKey, AdZone>;

/** Display slots use the native zone; behaviour zones are triggered separately. */
export const AD_SLOT_ZONE: Record<AdSlotVariant, AdZoneKey> = {
  inline: "native",
  "in-grid": "native",
  "sticky-footer": "native",
};

/** Development builds draw outlined, labelled placeholders for every slot. */
export const IS_AD_DEV: boolean = process.env.NODE_ENV !== "production";

/**
 * Account-specific bridge that defines `window.ongxAds` (see
 * `src/lib/ads-client.ts`). Monetag hands out different snippets per format and
 * per publisher, so the repo never guesses an SDK URL. Keep this as the single
 * integration point (DECISIONS ASUMSI-041).
 */
export const AD_ADAPTER_URL = process.env.NEXT_PUBLIC_MT_ADAPTER_URL;
