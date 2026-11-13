import { Button } from "@ongx/ui";
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { EpisodeList } from "@/components/episode-list";
import { OffersPanel } from "@/components/offers-panel";
import { ReportDialog } from "@/components/report-dialog";
import { TrailerDialog } from "@/components/trailer-dialog";
import { Link } from "@/i18n/navigation";
import type { EpisodeView, TitleDetailView } from "@/lib/titles/view";

export interface EpisodeDetailProps {
  title: TitleDetailView;
  episode: EpisodeView;
}

export async function EpisodeDetail({ title, episode }: EpisodeDetailProps) {
  const [detail, episodesT, watchT] = await Promise.all([
    getTranslations("detail"),
    getTranslations("episodes"),
    getTranslations("watch"),
  ]);

  const all = title.seasons.flatMap((season) => season.episodes);
  const index = all.findIndex((entry) => entry.id === episode.id);
  const previous = index > 0 ? all[index - 1] : undefined;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : undefined;
  const image = episode.stillUrl ?? title.backdropUrl;

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-6">
      <Link
        href={title.href}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        {title.title}
      </Link>

      <header className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {episodesT("episode", { number: episode.number })}
          {" · "}
          {episode.name}
        </h1>
        <p className="text-sm text-[var(--fg-dim)]">
          {episodesT("season", { number: episode.season })}
        </p>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-dim)]">
        {episode.airDateLabel ? (
          <span>{episodesT("airDate", { date: episode.airDateLabel })}</span>
        ) : null}
        {episode.durationLabel ? <span>{episode.durationLabel}</span> : null}
        {title.rating !== undefined ? (
          <span className="inline-flex items-center gap-1">
            <Star
              aria-hidden="true"
              className="size-3.5 fill-[var(--accent)] text-[var(--accent)]"
            />
            {title.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface-2)]">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href={episode.watchHref}>
                <Play aria-hidden="true" />
                {detail("watch")}
              </Link>
            </Button>
            {title.trailerKey ? (
              <TrailerDialog
                trailerKey={title.trailerKey}
                title={`${title.title} — ${episode.name}`}
                label={detail("trailer")}
                size="lg"
              />
            ) : null}
          </div>
          <ReportDialog titleId={title.id} title={`${title.title} — ${episode.name}`} />
        </div>
      </div>

      {episode.synopsis ? (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold tracking-tight">{detail("overview")}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--fg-dim)]">
            {episode.synopsis}
          </p>
        </section>
      ) : (
        <p className="mt-6 text-sm italic text-[var(--fg-dim)]">{detail("noSynopsis")}</p>
      )}

      <nav className="mt-6 flex flex-wrap items-center justify-between gap-2">
        {previous ? (
          <Button asChild variant="outline" size="sm">
            <Link href={previous.href}>
              <ChevronLeft aria-hidden="true" />
              {episodesT("episode", { number: previous.number })}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button asChild variant="outline" size="sm">
            <Link href={next.href}>
              {episodesT("episode", { number: next.number })}
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>

      <EpisodeList
        seasons={title.seasons}
        active={{ season: episode.season, number: episode.number }}
      />

      <OffersPanel offers={title.offers} heading={watchT("offersHeading")} />
    </article>
  );
}
