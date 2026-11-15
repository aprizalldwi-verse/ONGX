import { getTitleBySlug } from "@/lib/titles/queries";
import { OG_SIZE, renderOgImage } from "@/lib/og";

export const alt = "ONGX";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const title = await getTitleBySlug(slug, locale);
  const genres = title?.genres
    .map((genre) => genre.name)
    .slice(0, 3)
    .join(" · ");

  return renderOgImage({
    title: title?.title ?? "ONGX",
    subtitle: [title?.year, genres]
      .filter((value) => value !== undefined && value !== "")
      .join(" · "),
    ...(title?.posterUrl !== undefined ? { posterUrl: title.posterUrl } : {}),
    badge: locale === "en" ? "Movie" : "Film",
  });
}
