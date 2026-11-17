import { Clapperboard } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fragment, Suspense } from "react";

import { AdSlot } from "@/components/ad-slot";
import { ContinueWatching } from "@/components/continue-watching";
import { EmptyState } from "@/components/empty-state";
import { Hero } from "@/components/hero";
import { JsonLd } from "@/components/json-ld";
import { TitleRail, TitleRailSkeleton } from "@/components/title-rail";
import { adSlotId, inlineSlotNumber } from "@/lib/ads";
import { websiteSchema } from "@/lib/schema";
import { absoluteUrl, clampDescription, localizedPath, pageMetadata } from "@/lib/seo";
import { getHomeHero, getHomeRail, type HomeRailKey } from "@/lib/titles/queries";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return pageMetadata({
    title: t("tagline"),
    description: clampDescription(t("description"), locale),
    path: "/",
    locale,
  });
}

const RAIL_HREF: Record<HomeRailKey, string> = {
  trending: "/trending",
  vidio: "/trending?provider=vidio",
  new: "/baru",
  topRated: "/trending?sort=rating",
  anime: "/anime",
  film: "/film",
  series: "/series",
  action: "/genre/action",
  comedy: "/genre/comedy",
};

const RAIL_KEYS = Object.keys(RAIL_HREF) as HomeRailKey[];
const FIRST_RAIL_KEY: HomeRailKey = "trending";

/**
 * Each rail resolves on its own so the page shell and hero reach the browser
 * first. `TitleRail` hides itself when the query returns no items.
 */
async function HomeRail({
  locale,
  railKey,
  priorityFirst,
}: {
  locale: string;
  railKey: HomeRailKey;
  priorityFirst: boolean;
}) {
  const [t, items] = await Promise.all([getTranslations("home"), getHomeRail(railKey, locale)]);

  return (
    <TitleRail
      title={t(`rails.${railKey}`)}
      items={items}
      href={RAIL_HREF[railKey]}
      actionLabel={t("railAction")}
      priorityFirst={priorityFirst}
    />
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, hero] = await Promise.all([getTranslations("home"), getHomeHero(locale)]);

  return (
    <div className="pb-10">
      <JsonLd
        data={websiteSchema({
          siteUrl: absoluteUrl("/"),
          searchUrl: absoluteUrl(localizedPath("/cari", locale)),
          locale,
        })}
      />
      {hero ? <Hero item={hero} /> : null}

      <div className="mx-auto w-full max-w-6xl px-4">
        <ContinueWatching />

        {hero ? (
          <>
            {/* The first rail is awaited so its poster can be preloaded with the
                shell; later rails stream behind Suspense. */}
            <HomeRail locale={locale} railKey={FIRST_RAIL_KEY} priorityFirst />

            {RAIL_KEYS.slice(1).map((railKey, offset) => {
              const index = offset + 1;
              const slotNumber = inlineSlotNumber(index);

              return (
                <Fragment key={railKey}>
                  <Suspense fallback={<TitleRailSkeleton />}>
                    <HomeRail locale={locale} railKey={railKey} priorityFirst={false} />
                  </Suspense>
                  {slotNumber !== undefined ? (
                    <AdSlot variant="inline" slotId={adSlotId("inline", slotNumber, "home")} />
                  ) : null}
                </Fragment>
              );
            })}
          </>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={Clapperboard}
              title={t("emptyTitle")}
              body={t("emptyBody")}
              action={{ label: t("railAction"), href: "/trending" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
