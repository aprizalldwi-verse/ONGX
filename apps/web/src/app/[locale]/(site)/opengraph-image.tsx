import { getTranslations } from "next-intl/server";

import { OG_SIZE, renderOgImage } from "@/lib/og";

export const alt = "ONGX — katalog film, series, dan anime";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return renderOgImage({
    title: t("tagline"),
    subtitle: t("description"),
    badge: locale === "en" ? "Movies · Series · Anime" : "Film · Series · Anime",
  });
}
