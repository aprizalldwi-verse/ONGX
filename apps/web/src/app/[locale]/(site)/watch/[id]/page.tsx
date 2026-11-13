import { Button } from "@ongx/ui";
import { ArrowLeft, Play } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EpisodeList } from "@/components/episode-list";
import { OffersPanel } from "@/components/offers-panel";
import { ReportDialog } from "@/components/report-dialog";
import { TrailerDialog } from "@/components/trailer-dialog";
import { WatchPlayer } from "@/components/watch-player";
import { Link } from "@/i18n/navigation";
import { getTitleById } from "@/lib/titles/queries";
import type { EpisodeView } from "@/lib/titles/view";

export const revalidate = 1_800;

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function pickEpisode(
  episodes: EpisodeView[],
  season: number | undefined,
  number: number | undefined,
): EpisodeView | undefined {
  if (episodes.length === 0) return undefined;
  if (number !== undefined) {
    return episodes.find(
      (episode) => episode.number === number && (season === undefined || episode.season === season),
    );
  }
  if (season !== undefined) {
    return episodes.find((episode) => episode.season === season) ?? episodes[0];
  }
  return episodes[0];
}

export async function generateMetadata({ params }: Props) {
  const { locale, id } = await params;
  const title = await getTitleById(id, locale);
  if (!title) return {};

  return {
    title: title.title,
    description: title.synopsis?.slice(0, 160) ?? undefined,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [title, query, t] = await Promise.all([
    getTitleById(id, locale),
    searchParams,
    getTranslations("watch"),
  ]);

  if (!title) notFound();

  const episodes = title.seasons.flatMap((season) => season.episodes);
  const activeEpisode = pickEpisode(episodes, positiveInt(query.s), positiveInt(query.e));
  const streamUrl =
    title.source === "OWN" ? (activeEpisode?.streamUrl ?? title.streamUrl) : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <Link
        href={title.href}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        {t("backToDetail")}
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {title.title}
        </h1>
        {activeEpisode ? (
          <p className="mt-1 text-sm text-[var(--fg-dim)]">
            {t("episodeLabel", {
              season: activeEpisode.season,
              number: activeEpisode.number,
            })}
            {" · "}
            {activeEpisode.name}
          </p>
        ) : null}
      </header>

      <div className="mt-4">
        {streamUrl !== undefined ? (
          <WatchPlayer
            streamUrl={streamUrl}
            title={{
              id: title.id,
              slug: title.slug,
              source: title.source,
              kind: title.kind,
              title: title.title,
              ...(title.posterUrl !== undefined ? { posterUrl: title.posterUrl } : {}),
            }}
            {...(activeEpisode
              ? {
                  episode: {
                    season: activeEpisode.season,
                    number: activeEpisode.number,
                    name: activeEpisode.name,
                  },
                }
              : {})}
          />
        ) : (
          <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]">
            <div className="relative aspect-video w-full bg-[var(--surface-2)]">
              {title.backdropUrl ? (
                <Image
                  src={title.backdropUrl}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="object-cover opacity-60"
                />
              ) : null}
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/40 to-transparent p-4 text-center">
                <div className="max-w-md space-y-3">
                  <h2 className="font-display text-xl font-bold tracking-tight">
                    {t("notAvailableTitle")}
                  </h2>
                  <p className="text-sm text-[var(--fg-dim)]">{t("notAvailableBody")}</p>
                  {title.trailerKey ? (
                    <TrailerDialog
                      trailerKey={title.trailerKey}
                      title={title.title}
                      label={t("trailer")}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] p-3">
              <Button asChild variant="outline" size="sm">
                <Link href={title.href}>
                  <Play aria-hidden="true" />
                  {t("backToDetail")}
                </Link>
              </Button>
              <ReportDialog titleId={title.id} title={title.title} />
            </div>
          </section>
        )}
      </div>

      <OffersPanel offers={title.offers} heading={t("offersHeading")} />

      {episodes.length > 0 ? (
        <EpisodeList
          seasons={title.seasons}
          active={
            activeEpisode
              ? { season: activeEpisode.season, number: activeEpisode.number }
              : undefined
          }
        />
      ) : null}

      {streamUrl !== undefined ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {title.trailerKey ? (
            <TrailerDialog trailerKey={title.trailerKey} title={title.title} />
          ) : null}
          <ReportDialog titleId={title.id} title={title.title} />
        </div>
      ) : null}
    </div>
  );
}
