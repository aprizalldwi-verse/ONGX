import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LibraryList } from "@/components/library-list";
import { PageStub } from "@/components/page-stub";
import { clampDescription, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.playlist" });

  return pageMetadata({
    title: t("title"),
    description: clampDescription(t("body"), locale),
    path: "/playlist",
    locale,
    noindex: true,
  });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.playlist");

  return (
    <PageStub title={t("title")} body={t("body")}>
      <LibraryList list="playlist" />
    </PageStub>
  );
}
