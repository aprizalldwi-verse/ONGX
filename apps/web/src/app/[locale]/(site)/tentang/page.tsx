import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageStub } from "@/components/page-stub";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.about");

  return <PageStub title={t("title")} body={t("body")} />;
}
