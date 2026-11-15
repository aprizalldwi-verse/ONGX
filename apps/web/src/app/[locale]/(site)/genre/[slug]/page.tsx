import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CatalogListing } from "@/components/catalog-listing";
import { redirectLegacyPath } from "@/lib/redirects";
import { clampDescription, pageMetadata } from "@/lib/seo";
import { canonicalPagePath, type SearchParams } from "@/lib/titles/filters";
import { getGenreBySlug } from "@/lib/titles/queries";
import { localizedGenre } from "@/lib/titles/view";

export const revalidate = 600;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return {};

  const t = await getTranslations({ locale, namespace: "genre" });
  const name = localizedGenre(genre, locale);
  const { path, page } = canonicalPagePath(`/genre/${genre.slug}`, await searchParams);

  return pageMetadata({
    title: name,
    description: clampDescription(t("description", { name }), locale),
    path,
    locale,
    noindex: page > 20,
  });
}

export default async function Page({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [genre, t] = await Promise.all([getGenreBySlug(slug), getTranslations("genre")]);

  if (!genre) {
    await redirectLegacyPath(`/genre/${slug}`, locale);
    notFound();
  }

  const name = localizedGenre(genre, locale);

  return (
    <CatalogListing
      locale={locale}
      basePath={`/genre/${genre.slug}`}
      heading={name}
      description={t("description", { name })}
      searchParams={await searchParams}
      fixedGenre={genre.slug}
    />
  );
}
