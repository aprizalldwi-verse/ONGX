import { AD_ZONES, type AdZoneKey } from "@/config/ads";

/** Account-specific bridge: implement using the approved network snippets. */
export interface AdNetworkAdapter {
  show(key: AdZoneKey, zoneId: string): Promise<"completed" | "closed" | "unavailable">;
  mount(element: HTMLElement, zoneId: string): void | (() => void);
}

declare global {
  interface Window {
    ongxAds?: AdNetworkAdapter;
  }
}

export async function triggerAdZone(key: AdZoneKey): Promise<boolean> {
  const zone = AD_ZONES[key];
  if (!zone.enabled || !zone.zoneId || !window.ongxAds) return false;
  try {
    return (await window.ongxAds.show(key, zone.zoneId)) === "completed";
  } catch {
    return false;
  }
}
