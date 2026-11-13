import { Clapperboard } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ContinueWatching } from "@/components/continue-watching";
import { EmptyState } from "@/components/empty-state";
import { Hero } from "@/components/hero";
import { TitleRail } from "@/components/title-rail";
import { getHomeData, type HomeRailKey } from "@/lib/titles/queries";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

const RAIL_HREF: Record<HomeRailKey, string> = {
  trending: "/trending",
  new: "/baru",
  topRated: "/trending?sort=rating",
  anime: "/anime",
  film: "/film",
  series: "/series",
  action: "/genre/action",
  comedy: "/genre/comedy",
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, data] = await Promise.all([getTranslations("home"), getHomeData(locale)]);
  const rails = data.rails.filter((rail) => rail.items.length > 0);

  return (
    <div className="pb-10">
      {data.hero ? <Hero item={data.hero} /> : null}

      <div className="mx-auto w-full max-w-6xl px-4">
        <ContinueWatching />

        {rails.length > 0 ? (
          rails.map((rail) => (
            <TitleRail
              key={rail.key}
              title={t(`rails.${rail.key}`)}
              items={rail.items}
              href={RAIL_HREF[rail.key]}
              actionLabel={t("railAction")}
            />
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
