import { getTranslations } from "next-intl/server";
import Image from "next/image";
import type { ReactNode } from "react";

import { AD_SLOT_ZONE, AD_ZONES, IS_AD_DEV, type AdZoneKey } from "@/config/ads";
import { AD_SLOT_HEIGHT, type AdSlotVariant } from "@/lib/ads";

export interface AdSlotProps {
  variant: AdSlotVariant;
  /** Unique per page; also rendered as `data-slot-id` for future A/B tests. */
  slotId: string;
  zone?: AdZoneKey;
  className?: string;
}

function wrapperClass(variant: AdSlotVariant): string {
  switch (variant) {
    case "inline":
      return "my-8 w-full overflow-hidden rounded-[var(--radius-lg)]";
    case "in-grid":
      return "col-span-2 overflow-hidden rounded-[var(--radius)] sm:col-span-3 md:col-span-2";
    case "sticky-footer":
      return "fixed inset-x-0 bottom-14 z-30 overflow-hidden border-t border-[var(--line)] bg-[var(--surface)] md:bottom-0";
  }
}

/**
 * A reserved ad surface. Enabled slots render an empty container with a locked
 * height so the eventual creative cannot shift the page. Disabled slots are
 * zero-height/hidden in production (CLS 0) and outlined, labelled boxes in dev.
 */
export async function AdSlot({
  variant,
  slotId,
  zone = AD_SLOT_ZONE[variant],
  className,
}: AdSlotProps): Promise<ReactNode> {
  const t = await getTranslations("ads");
  const config = AD_ZONES[zone];
  const enabled = config.enabled;
  const height = AD_SLOT_HEIGHT[variant];
  const zoneId = config.zoneId ?? "";

  if (!enabled && !IS_AD_DEV) {
    return (
      <div
        hidden
        data-slot-id={slotId}
        data-zone={zoneId}
        data-zone-key={config.key}
        data-ad-disabled="true"
      />
    );
  }

  const classes = [wrapperClass(variant), className].filter(Boolean).join(" ");

  if (!enabled) {
    return (
      <div
        data-slot-id={slotId}
        data-zone={zoneId}
        data-zone-key={config.key}
        data-ad-variant={variant}
        data-ad-enabled="false"
        className={classes}
        style={{ height }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-[inherit] border-2 border-dashed border-[var(--line)] bg-[var(--surface-2)]/40 px-3 text-center">
          <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-[var(--fg-dim)]">
            {t("devSlot", { zone: config.key, height })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="complementary"
      aria-label={t("label")}
      data-slot-id={slotId}
      data-zone={zoneId}
      data-zone-key={config.key}
      data-ad-variant={variant}
      data-ad-enabled="true"
      className={classes}
      style={{ height }}
    >
      <noscript>
        <div
          className="flex h-full w-full items-center justify-center border border-dashed border-[var(--line)] text-xs text-[var(--fg-dim)]"
          style={{ height }}
        >
          {t("noscript")}
          <Image src="/ad-placeholder.svg" alt="" width={300} height={250} unoptimized />
        </div>
      </noscript>
    </div>
  );
}
