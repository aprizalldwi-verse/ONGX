"use client";

import { Button } from "@ongx/ui";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AD_ADAPTER_URL, AD_ZONES, ADS_ENABLED } from "@/config/ads";
import {
  dismissAdblockNudge,
  INTERNAL_NAV_KEY,
  isAdblockDismissed,
  LAST_PATH_KEY,
} from "@/lib/ads";
import { triggerAdZone } from "@/lib/ads-client";

/**
 * The only ad bootstrap in the tree. Loads the smart tag, in-page push and
 * vignette exactly once each (`lazyOnload`) and arms the gesture-gated popunder.
 * Mounted in the locale layout so every public route shares one instance.
 */
export function AdProvider() {
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const mounted = new WeakSet<HTMLElement>();
    const mount = (): void => {
      if (!window.ongxAds) return;
      document.querySelectorAll<HTMLElement>('[data-ad-enabled="true"]').forEach((element) => {
        if (mounted.has(element) || !element.dataset.zone) return;
        mounted.add(element);
        const cleanup = window.ongxAds?.mount(element, element.dataset.zone);
        if (cleanup) cleanups.push(cleanup);
      });
    };
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("ongx:ads-ready", mount);
    mount();
    return () => {
      observer.disconnect();
      window.removeEventListener("ongx:ads-ready", mount);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  useEffect(() => {
    if (!AD_ZONES.popunder.enabled) return;

    let fired = false;
    const onFirstPointerDown = (): void => {
      if (fired) return;
      fired = true;
      window.removeEventListener("pointerdown", onFirstPointerDown, true);
      triggerAdZone("popunder");
    };

    window.addEventListener("pointerdown", onFirstPointerDown, {
      capture: true,
      once: true,
      passive: true,
    });

    return () => window.removeEventListener("pointerdown", onFirstPointerDown, true);
  }, []);

  return (
    <>
      <InternalNavigationMarker />
      {ADS_ENABLED && AD_ADAPTER_URL ? (
        <Script
          id="ongx-ad-adapter"
          src={AD_ADAPTER_URL}
          strategy="lazyOnload"
          onReady={() => {
            window.dispatchEvent(new Event("ongx:ads-ready"));
            for (const key of ["smartTag", "inPagePush", "vignette"] as const) {
              void triggerAdZone(key);
            }
          }}
        />
      ) : null}
      <AdblockNudge />
    </>
  );
}

/**
 * `document.referrer` stays frozen across App Router navigations, so the
 * interstitial also needs to know that the viewer arrived from another page of
 * this app. Record every pathname change in sessionStorage.
 */
function InternalNavigationMarker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storage = window.sessionStorage;
      const previous = storage.getItem(LAST_PATH_KEY);
      if (previous !== null && previous !== pathname) {
        storage.setItem(INTERNAL_NAV_KEY, "1");
      }
      storage.setItem(LAST_PATH_KEY, pathname);
    } catch {
      // Storage unavailable: the interstitial simply falls back to document.referrer.
    }
  }, [pathname]);

  return null;
}

/**
 * Lightweight adblock check: a bait element with common blocker classes is
 * appended off-screen and measured. Cosmetic filters hide it, which is enough
 * for a nudge — no network probes and no false positives from slow CDNs.
 */
function AdblockNudge() {
  const t = useTranslations("ads");
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!ADS_ENABLED) return;

    try {
      if (isAdblockDismissed(window.sessionStorage)) {
        setDismissed(true);
        return;
      }
    } catch {
      return;
    }

    const bait = document.createElement("div");
    bait.className = "adsbox ad-banner ad-placement ad-slot";
    bait.setAttribute("aria-hidden", "true");
    bait.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(bait);

    const timer = window.setTimeout(() => {
      const style = window.getComputedStyle(bait);
      const hidden =
        bait.offsetHeight === 0 ||
        bait.offsetParent === null ||
        style.display === "none" ||
        style.visibility === "hidden";
      bait.remove();
      if (hidden) setBlocked(true);
    }, 400);

    return () => {
      window.clearTimeout(timer);
      bait.remove();
    };
  }, []);

  if (!blocked || dismissed) return null;

  function close(): void {
    setDismissed(true);
    try {
      dismissAdblockNudge(window.sessionStorage);
    } catch {
      // Storage can be unavailable; the state still hides the bar.
    }
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-14 z-40 border-t border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 shadow-lg md:bottom-0"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{t("adblockTitle")}</p>
          <p className="mt-0.5 text-[11px] text-[var(--fg-dim)]">{t("adblockBody")}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label={t("adblockDismiss")}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
