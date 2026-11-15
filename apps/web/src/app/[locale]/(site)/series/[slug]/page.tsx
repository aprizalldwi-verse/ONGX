import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { JsonLd } from "@/components/json-ld";
import { TitleDetail } from "@/components/title-detail";
import { redirectLegacyPath } from "@/lib/redirects";
import { breadcrumbSchema, titleSchema } from "@/lib/schema";
import { absoluteUrl, clampDescription, localizedPath, pageMetadata } from "@/lib/seo";
import { getRelatedTitles, getTitleBySlug } from "@/lib/titles/queries";

export const revalidate = 1_800;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const title = await getTitleBySlug(slug, locale);
  if (!title || title.source !== "TMDB" || title.kind !== "SERIES") return {};

  const t = await getTranslations({ locale, namespace: "meta" });

  return pageMetadata({
    title: title.title,
    description: clampDescription(
      title.synopsis,
      locale,
      t("titleFallback", { title: title.title }),
    ),
    path: title.href,
    locale,
    type: "video.tv_show",
  });
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const title = await getTitleBySlug(slug, locale);
  if (!title || title.source !== "TMDB" || title.kind !== "SERIES") {
    await redirectLegacyPath(`/series/${slug}`, locale);
    notFound();
  }

  const [related, nav] = await Promise.all([
    getRelatedTitles(
      {
        id: title.id,
        kind: title.kind,
        source: title.source,
        genreSlugs: title.genres.map((genre) => genre.slug),
      },
      locale,
    ),
    getTranslations({ locale, namespace: "nav" }),
  ]);

  const breadcrumb = [
    { name: nav("home"), href: "/" },
    { name: nav("series"), href: "/series" },
    { name: title.title },
  ];

  return (
    <>
      <JsonLd
        data={titleSchema(title, {
          url: absoluteUrl(localizedPath(title.href, locale)),
          locale,
        })}
      />
      <JsonLd data={breadcrumbSchema(breadcrumb)} />
      <TitleDetail title={title} related={related} />
    </>
  );
}
