import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageStub } from "@/components/page-stub";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.genre");

  return (
    <PageStub title={t("title")} body={t("body")}>
      <p className="text-sm text-[var(--fg-dim)]">slug: {slug}</p>
    </PageStub>
  );
}
