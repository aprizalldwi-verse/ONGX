import { Clapperboard } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { ContinueWatching } from "@/components/continue-watching";
import { EmptyState } from "@/components/empty-state";
import { Hero } from "@/components/hero";
import { TitleRail, TitleRailSkeleton } from "@/components/title-rail";
import { getHomeHero, getHomeRail, type HomeRailKey } from "@/lib/titles/queries";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

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

/**
 * Each rail resolves on its own so the page shell and hero reach the browser
 * first. `TitleRail` hides itself when the query returns no items.
 */
async function HomeRail({ locale, railKey }: { locale: string; railKey: HomeRailKey }) {
  const [t, items] = await Promise.all([getTranslations("home"), getHomeRail(railKey, locale)]);

  return (
    <TitleRail
      title={t(`rails.${railKey}`)}
      items={items}
      href={RAIL_HREF[railKey]}
      actionLabel={t("railAction")}
    />
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, hero] = await Promise.all([getTranslations("home"), getHomeHero(locale)]);

  return (
    <div className="pb-10">
      {hero ? <Hero item={hero} /> : null}

      <div className="mx-auto w-full max-w-6xl px-4">
        <ContinueWatching />

        {hero ? (
          RAIL_KEYS.map((railKey) => (
            <Suspense key={railKey} fallback={<TitleRailSkeleton />}>
              <HomeRail locale={locale} railKey={railKey} />
            </Suspense>
          ))
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
