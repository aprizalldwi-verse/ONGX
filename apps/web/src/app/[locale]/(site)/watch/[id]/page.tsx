import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageStub } from "@/components/page-stub";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function Page({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.watch");

  return (
    <PageStub title={t("title")} body={t("body")}>
      <p className="text-sm text-[var(--fg-dim)]">id: {id}</p>
    </PageStub>
  );
}
