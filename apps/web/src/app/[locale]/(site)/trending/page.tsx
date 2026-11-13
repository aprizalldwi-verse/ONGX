import { getTranslations, setRequestLocale } from "next-intl/server";

import { CatalogListing } from "@/components/catalog-listing";
import type { SearchParams } from "@/lib/titles/filters";

export const revalidate = 600;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations("pages.trending");
  return { title: t("title"), description: t("body") };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.trending");

  return (
    <CatalogListing
      locale={locale}
      basePath="/trending"
      heading={t("title")}
      description={t("body")}
      searchParams={await searchParams}
    />
  );
}
