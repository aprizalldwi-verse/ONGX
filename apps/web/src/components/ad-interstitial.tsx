"use client";

import { useEffect } from "react";
import { AD_ZONES } from "@/config/ads";
import { hasShownInterstitial, markInterstitialShown, shouldShowInterstitial } from "@/lib/ads";
import { triggerAdZone } from "@/lib/ads-client";

export function AdInterstitial() {
  useEffect(() => {
    if (!AD_ZONES.interstitial.enabled) return;
    let storage: Storage;
    try {
      storage = window.sessionStorage;
    } catch {
      return;
    }
    let disposed = false;
    const check = (): void => {
      if (
        !window.ongxAds ||
        !shouldShowInterstitial({
          enabled: true,
          referrer: document.referrer,
          origin: location.origin,
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight,
          alreadyShown: hasShownInterstitial(storage),
        })
      )
        return;
      markInterstitialShown(storage);
      window.removeEventListener("scroll", check);
      window.dispatchEvent(new Event("ongx:ad-pause"));
      void triggerAdZone("interstitial").finally(() => {
        if (!disposed) window.dispatchEvent(new Event("ongx:ad-resume"));
      });
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => {
      disposed = true;
      window.removeEventListener("scroll", check);
    };
  }, []);
  return null;
}
