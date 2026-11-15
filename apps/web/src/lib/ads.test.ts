import { describe, expect, it } from "vitest";
import {
  inlineSlotNumber,
  inGridSlotAfterCard,
  shouldShowInterstitial,
  readRewardedUnlock,
  writeRewardedUnlock,
  REWARDED_TTL_MS,
  REWARDED_STORAGE_KEY,
  hasShownInterstitial,
  markInterstitialShown,
} from "./ads";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe("ad placement and session rules", () => {
  it("caps rail slots and inserts grid slots after seven cards", () => {
    expect(Array.from({ length: 20 }, (_, i) => inlineSlotNumber(i)).filter(Boolean)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(inGridSlotAfterCard(5)).toBe(false);
    expect(inGridSlotAfterCard(6)).toBe(true);
  });
  it("requires internal referrer and more than one viewport", () => {
    const input = {
      enabled: true,
      referrer: "https://ongx.example/film",
      origin: "https://ongx.example",
      scrollY: 801,
      viewportHeight: 800,
      alreadyShown: false,
    };
    expect(shouldShowInterstitial(input)).toBe(true);
    for (const override of [
      { referrer: "" },
      { referrer: "https://other.example" },
      { scrollY: 800 },
      { enabled: false },
      { alreadyShown: true },
    ]) {
      expect(shouldShowInterstitial({ ...input, ...override })).toBe(false);
    }
  });
  it("expires rewards exactly at 30 minutes and rejects malformed storage", () => {
    const store = storage();
    writeRewardedUnlock(store, 1000);
    expect(readRewardedUnlock(store, 1000 + REWARDED_TTL_MS - 1)).toBe(true);
    expect(readRewardedUnlock(store, 1000 + REWARDED_TTL_MS)).toBe(false);
    store.setItem(REWARDED_STORAGE_KEY, '{"expiresAt":"tomorrow"}');
    expect(readRewardedUnlock(store)).toBe(false);
  });
  it("records one interstitial per session", () => {
    const store = storage();
    expect(hasShownInterstitial(store)).toBe(false);
    markInterstitialShown(store);
    expect(hasShownInterstitial(store)).toBe(true);
  });
});
