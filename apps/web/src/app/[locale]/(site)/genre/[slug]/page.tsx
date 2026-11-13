import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CatalogListing } from "@/components/catalog-listing";
import type { SearchParams } from "@/lib/titles/filters";
import { getGenreBySlug } from "@/lib/titles/queries";
import { localizedGenre } from "@/lib/titles/view";

export const revalidate = 600;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const { locale, slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return {};

  const t = await getTranslations({ locale, namespace: "genre" });
  const name = localizedGenre(genre, locale);

  return {
    title: name,
    description: t("description", { name }),
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [genre, t] = await Promise.all([getGenreBySlug(slug), getTranslations("genre")]);

  if (!genre) notFound();

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
