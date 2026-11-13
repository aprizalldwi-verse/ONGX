import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { TitleDetail } from "@/components/title-detail";
import { getRelatedTitles, getTitleBySlug } from "@/lib/titles/queries";

export const revalidate = 1_800;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const title = await getTitleBySlug(slug, locale);
  if (!title) return {};

  return {
    title: title.title,
    description: title.synopsis?.slice(0, 160) ?? undefined,
    openGraph: {
      title: title.title,
      ...(title.backdropUrl ? { images: [{ url: title.backdropUrl }] } : {}),
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const title = await getTitleBySlug(slug, locale);
  if (!title || title.source !== "ANILIST") notFound();

  const related = await getRelatedTitles(
    {
      id: title.id,
      kind: title.kind,
      source: title.source,
      genreSlugs: title.genres.map((genre) => genre.slug),
    },
    locale,
  );

  return <TitleDetail title={title} related={related} />;
}
