/**
 * Pure ad-engine helpers. No React, no DOM globals and no env access so the
 * placement rules, interstitial trigger and rewarded TTL can be unit tested.
 */

export type AdSlotVariant = "inline" | "in-grid" | "sticky-footer";

/** Locked heights keep Cumulative Layout Shift at zero when a slot fills. */
export const AD_SLOT_HEIGHT: Record<AdSlotVariant, number> = {
  inline: 250,
  "in-grid": 300,
  "sticky-footer": 100,
};

/** One inline slot after every second rail, capped per page. */
export const AD_INLINE_EVERY = 2;
export const AD_INLINE_MAX = 6;

/** One in-grid slot after every seventh poster card. */
export const AD_IN_GRID_EVERY = 7;

export const INTERSTITIAL_STORAGE_KEY = "ongx_int";
export const ADBLOCK_DISMISS_KEY = "ongx:adblock-dismissed";
/** Set by the layout marker when a client-side navigation happened in-app. */
export const INTERNAL_NAV_KEY = "ongx:internal-nav";
export const LAST_PATH_KEY = "ongx:last-path";

export const REWARDED_STORAGE_KEY = "ongx:rewarded:1080";
export const REWARDED_TTL_MS = 30 * 60 * 1_000;
export const REWARDED_MIN_HEIGHT = 1080;

/**
 * Stable, unique DOM id. `scope` separates repeated grids on the same page
 * (for example cast and crew on a person page).
 */
export function adSlotId(variant: AdSlotVariant, index: number, scope = "page"): string {
  const safeIndex = Math.max(0, Math.trunc(index));
  return `ongx-ad-${scope}-${variant}-${safeIndex}`;
}

/** `true` when an inline slot belongs after this zero-based rail index. */
export function inlineSlotAfterRail(railIndex: number): boolean {
  return (railIndex + 1) % AD_INLINE_EVERY === 0;
}

/**
 * 1-based slot number for a rail, or `undefined` when the page already reached
 * `AD_INLINE_MAX`. Used both for rendering and for `data-slot-id`.
 */
export function inlineSlotNumber(railIndex: number): number | undefined {
  if (!inlineSlotAfterRail(railIndex)) return undefined;
  const number = (railIndex + 1) / AD_INLINE_EVERY;
  return number <= AD_INLINE_MAX ? number : undefined;
}

/** `true` when an in-grid slot belongs after this zero-based card index. */
export function inGridSlotAfterCard(cardIndex: number): boolean {
  return (cardIndex + 1) % AD_IN_GRID_EVERY === 0;
}

export interface InterstitialTrigger {
  enabled: boolean;
  referrer: string;
  origin: string;
  scrollY: number;
  viewportHeight: number;
  alreadyShown: boolean;
  /**
   * `document.referrer` does not change during App Router client navigations,
   * so the layout marker also records an in-app navigation in sessionStorage.
   */
  internalNavigation?: boolean;
}

export function isInternalReferrer(referrer: string, origin: string): boolean {
  if (referrer.length === 0) return false;

  try {
    return new URL(referrer).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

/**
 * Interstitial rules from the brief: only when enabled, only once per session,
 * only after an internal navigation and only after the viewer scrolled past the
 * first viewport (so it never interrupts the initial read).
 */
export function shouldShowInterstitial(trigger: InterstitialTrigger): boolean {
  if (!trigger.enabled || trigger.alreadyShown) return false;
  if (
    trigger.internalNavigation !== true &&
    !isInternalReferrer(trigger.referrer, trigger.origin)
  ) {
    return false;
  }
  return trigger.scrollY > trigger.viewportHeight;
}

export interface AdSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function hasShownInterstitial(storage: AdSessionStorage): boolean {
  try {
    return storage.getItem(INTERSTITIAL_STORAGE_KEY) === "1";
  } catch {
    // Unreadable storage: err on the side of not nagging the viewer.
    return true;
  }
}

export function markInterstitialShown(storage: AdSessionStorage): void {
  try {
    storage.setItem(INTERSTITIAL_STORAGE_KEY, "1");
  } catch {
    // Session storage can be unavailable in private mode; the overlay still closes.
  }
}

interface RewardedRecord {
  expiresAt: number;
}

function readRewardedRecord(storage: AdSessionStorage): RewardedRecord | undefined {
  try {
    const raw = storage.getItem(REWARDED_STORAGE_KEY);
    if (raw === null) return undefined;

    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return undefined;

    const expiresAt = (parsed as { expiresAt?: unknown }).expiresAt;
    if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) return undefined;

    return { expiresAt };
  } catch {
    return undefined;
  }
}

/** Reads the rewarded 1080p unlock and clears it once it has expired. */
export function readRewardedUnlock(storage: AdSessionStorage, now = Date.now()): boolean {
  const record = readRewardedRecord(storage);
  if (record === undefined) return false;

  if (record.expiresAt <= now) {
    try {
      storage.removeItem(REWARDED_STORAGE_KEY);
    } catch {
      // Ignore: an expired record is harmless either way.
    }
    return false;
  }

  return true;
}

/** Grants the 1080p unlock for `REWARDED_TTL_MS` and returns its expiry. */
export function writeRewardedUnlock(storage: AdSessionStorage, now = Date.now()): number {
  const expiresAt = now + REWARDED_TTL_MS;

  try {
    storage.setItem(REWARDED_STORAGE_KEY, JSON.stringify({ expiresAt }));
  } catch {
    // Storage may be full or blocked; the caller keeps the in-memory unlock.
  }

  return expiresAt;
}

export function rewardedRemainingMs(storage: AdSessionStorage, now = Date.now()): number {
  const record = readRewardedRecord(storage);
  if (record === undefined) return 0;
  return Math.max(0, record.expiresAt - now);
}

/** Quality levels at or above 1080p sit behind the rewarded unlock. */
export function isRewardedHeight(height: number): boolean {
  return Number.isFinite(height) && height >= REWARDED_MIN_HEIGHT;
}

export function isAdblockDismissed(storage: AdSessionStorage): boolean {
  try {
    return storage.getItem(ADBLOCK_DISMISS_KEY) === "1";
  } catch {
    return true;
  }
}

export function dismissAdblockNudge(storage: AdSessionStorage): void {
  try {
    storage.setItem(ADBLOCK_DISMISS_KEY, "1");
  } catch {
    // Ignore.
  }
}
