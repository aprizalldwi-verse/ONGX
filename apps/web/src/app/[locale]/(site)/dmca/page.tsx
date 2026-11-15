import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageStub } from "@/components/page-stub";
import { clampDescription, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.dmca" });

  return pageMetadata({
    title: t("title"),
    description: clampDescription(t("body"), locale),
    path: "/dmca",
    locale,
  });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.dmca");

  return <PageStub title={t("title")} body={t("body")} />;
}
