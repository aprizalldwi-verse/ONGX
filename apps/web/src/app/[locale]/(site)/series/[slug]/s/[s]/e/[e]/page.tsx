import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EpisodeDetail } from "@/components/episode-detail";
import { JsonLd } from "@/components/json-ld";
import { redirectLegacyPath } from "@/lib/redirects";
import { breadcrumbSchema, episodeSchema } from "@/lib/schema";
import { absoluteUrl, clampDescription, localizedPath, pageMetadata } from "@/lib/seo";
import { getTitleBySlug } from "@/lib/titles/queries";
import type { EpisodeView, TitleDetailView } from "@/lib/titles/view";

export const revalidate = 1_800;

type Props = {
  params: Promise<{ locale: string; slug: string; s: string; e: string }>;
};

function positiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function findEpisode(
  title: TitleDetailView | null,
  season: number,
  number: number,
): EpisodeView | undefined {
  return title?.seasons
    .flatMap((entry) => entry.episodes)
    .find((entry) => entry.season === season && entry.number === number);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, s, e } = await params;
  const season = positiveInt(s);
  const number = positiveInt(e);
  if (season === undefined || number === undefined) return {};

  const title = await getTitleBySlug(slug, locale);
  if (!title || title.source !== "TMDB" || title.kind !== "SERIES") return {};

  const episode = findEpisode(title, season, number);
  if (!episode) return {};

  const t = await getTranslations({ locale, namespace: "meta" });

  return pageMetadata({
    title: `${title.title} — Episode ${episode.number}`,
    description: clampDescription(
      episode.synopsis ?? title.synopsis,
      locale,
      t("episodeFallback", { title: title.title, number: episode.number }),
    ),
    path: episode.href,
    locale,
    type: "video.episode",
  });
}

export default async function Page({ params }: Props) {
  const { locale, slug, s, e } = await params;
  setRequestLocale(locale);

  const season = positiveInt(s);
  const number = positiveInt(e);
  if (season === undefined || number === undefined) {
    await redirectLegacyPath(`/series/${slug}/s/${s}/e/${e}`, locale);
    notFound();
  }

  const title = await getTitleBySlug(slug, locale);
  if (!title || title.source !== "TMDB" || title.kind !== "SERIES") {
    await redirectLegacyPath(`/series/${slug}`, locale);
    notFound();
  }

  const episode = findEpisode(title, season, number);
  if (!episode) {
    await redirectLegacyPath(`/series/${slug}/s/${season}/e/${number}`, locale);
    notFound();
  }

  const [nav, episodesT] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "episodes" }),
  ]);

  const breadcrumb = [
    { name: nav("home"), href: "/" },
    { name: nav("series"), href: "/series" },
    { name: title.title, href: title.href },
    { name: `${episodesT("episode", { number: episode.number })} · ${episode.name}` },
  ];

  return (
    <>
      <JsonLd
        data={episodeSchema(title, episode, {
          url: absoluteUrl(localizedPath(episode.href, locale)),
          locale,
        })}
      />
      <JsonLd data={breadcrumbSchema(breadcrumb)} />
      <EpisodeDetail title={title} episode={episode} />
    </>
  );
}
