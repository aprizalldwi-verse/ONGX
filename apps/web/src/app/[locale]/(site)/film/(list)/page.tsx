import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CatalogListing } from "@/components/catalog-listing";
import { clampDescription, pageMetadata } from "@/lib/seo";
import { canonicalPagePath, type SearchParams } from "@/lib/titles/filters";

export const revalidate = 600;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.film" });
  const { path, page } = canonicalPagePath("/film", await searchParams);

  return pageMetadata({
    title: t("title"),
    description: clampDescription(t("body"), locale),
    path,
    locale,
    noindex: page > 20,
  });
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.film");

  return (
    <CatalogListing
      locale={locale}
      basePath="/film"
      heading={t("title")}
      description={t("body")}
      searchParams={await searchParams}
      kind="MOVIE"
      source="TMDB"
    />
  );
}
