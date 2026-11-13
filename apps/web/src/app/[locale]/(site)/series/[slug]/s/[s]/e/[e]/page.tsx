import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { EpisodeDetail } from "@/components/episode-detail";
import { getTitleBySlug } from "@/lib/titles/queries";

export const revalidate = 1_800;

type Props = {
  params: Promise<{ locale: string; slug: string; s: string; e: string }>;
};

function positiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug, s, e } = await params;
  const season = positiveInt(s);
  const number = positiveInt(e);
  if (season === undefined || number === undefined) return {};

  const title = await getTitleBySlug(slug, locale);
  const episode = title?.seasons
    .flatMap((entry) => entry.episodes)
    .find((entry) => entry.season === season && entry.number === number);
  if (!title || !episode) return {};

  return {
    title: `${title.title} — Episode ${episode.number}`,
    description: episode.synopsis?.slice(0, 160) ?? title.synopsis?.slice(0, 160) ?? undefined,
  };
}

export default async function Page({ params }: Props) {
  const { locale, slug, s, e } = await params;
  setRequestLocale(locale);

  const season = positiveInt(s);
  const number = positiveInt(e);
  if (season === undefined || number === undefined) notFound();

  const title = await getTitleBySlug(slug, locale);
  if (!title || title.source !== "TMDB" || title.kind !== "SERIES") notFound();

  const episode = title.seasons
    .flatMap((entry) => entry.episodes)
    .find((entry) => entry.season === season && entry.number === number);
  if (!episode) notFound();

  return <EpisodeDetail title={title} episode={episode} />;
}
