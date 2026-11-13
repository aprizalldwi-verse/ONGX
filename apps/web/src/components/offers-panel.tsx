import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { OfferView } from "@/lib/titles/view";

export interface OffersPanelProps {
  offers: OfferView[];
  heading?: string;
}

export async function OffersPanel({ offers, heading }: OffersPanelProps) {
  const t = await getTranslations("offers");

  return (
    <section aria-labelledby="offers-heading" className="mt-8">
      <h2 id="offers-heading" className="font-display text-lg font-bold tracking-tight">
        {heading ?? t("title")}
      </h2>

      {offers.length === 0 ? (
        <p className="mt-3 rounded-[var(--radius)] border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--fg-dim)]">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <li key={`${offer.providerId}:${offer.offerType}`}>
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex h-full items-center gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--accent)]"
                aria-label={t("open", { provider: offer.providerName })}
              >
                {offer.logoUrl ? (
                  <Image
                    src={offer.logoUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-[8px] object-cover"
                  />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-[8px] bg-[var(--surface-2)] text-sm font-bold">
                    {offer.providerName.slice(0, 1)}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{offer.providerName}</span>
                  <span className="block text-xs text-[var(--fg-dim)]">
                    {t(`types.${offer.offerType}`)}
                  </span>
                </span>

                <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-[var(--fg-dim)]" />
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-[var(--fg-dim)]">{t("note")}</p>
    </section>
  );
}
