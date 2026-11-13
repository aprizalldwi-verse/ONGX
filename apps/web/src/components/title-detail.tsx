import { Button } from "@ongx/ui";
import { ArrowLeft, Play, Star } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { TitleCardView, TitleDetailView } from "@/lib/titles/view";

import { CastRail } from "./cast-rail";
import { EpisodeList } from "./episode-list";
import { OffersPanel } from "./offers-panel";
import { ReportDialog } from "./report-dialog";
import { ShareRow } from "./share-row";
import { TitleRail } from "./title-rail";
import { TrailerDialog } from "./trailer-dialog";

export interface TitleDetailProps {
  title: TitleDetailView;
  related: TitleCardView[];
}

function catalogHref(title: TitleDetailView): string {
  if (title.source === "ANILIST") return "/anime";
  return title.kind === "MOVIE" ? "/film" : "/series";
}

export async function TitleDetail({ title, related }: TitleDetailProps) {
  const t = await getTranslations("detail");

  return (
    <article>
      <section className="relative isolate overflow-hidden border-b border-[var(--line)]">
        {title.backdropUrl ? (
          <Image
            src={title.backdropUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-35"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/80 to-[var(--bg)]/30" />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
          <Link
            href={catalogHref(title)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fg-dim)] transition-colors hover:text-[var(--accent)]"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            {t("backToCatalog")}
          </Link>

          <div className="mt-4 flex flex-col gap-6 sm:flex-row">
            {title.posterUrl ? (
              <div className="relative w-40 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] shadow-2xl sm:w-48 lg:w-56">
                <Image
                  src={title.posterUrl}
                  alt=""
                  width={342}
                  height={513}
                  sizes="224px"
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}

            <div className="min-w-0 flex-1 self-end">
              <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {title.title}
              </h1>
              {title.titleSecondary ? (
                <p className="mt-1 text-sm text-[var(--fg-dim)]">{title.titleSecondary}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--fg-dim)]">
                {title.year ? <span>{title.year}</span> : null}
                {title.durationLabel ? <span>{title.durationLabel}</span> : null}
                {title.ageRating ? <span>{title.ageRating}</span> : null}
                {title.country ? <span>{title.country}</span> : null}
                {title.episodeCount > 0 ? (
                  <span>{t("episodeCount", { count: title.episodeCount })}</span>
                ) : null}
                {title.rating !== undefined ? (
                  <span
                    className="inline-flex items-center gap-1 font-medium text-[var(--fg)]"
                    title={t("ratingLabel", { rating: title.rating.toFixed(1) })}
                  >
                    <Star
                      aria-hidden="true"
                      className="size-4 fill-[var(--accent)] text-[var(--accent)]"
                    />
                    {title.rating.toFixed(1)}
                  </span>
                ) : null}
              </div>

              {title.genres.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {title.genres.map((genre) => (
                    <Link
                      key={genre.slug}
                      href={genre.href}
                      className="rounded-full border border-[var(--line)] bg-[var(--bg)]/60 px-2.5 py-1 text-xs text-[var(--fg-dim)] backdrop-blur transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              ) : null}

              {title.synopsis ? (
                <p className="mt-4 max-w-prose text-sm leading-relaxed text-[var(--fg-dim)]">
                  {title.synopsis}
                </p>
              ) : (
                <p className="mt-4 text-sm italic text-[var(--fg-dim)]">{t("noSynopsis")}</p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button asChild size="lg">
                  <Link href={title.watchHref}>
                    <Play aria-hidden="true" />
                    {t("watch")}
                  </Link>
                </Button>

                {title.trailerKey ? (
                  <TrailerDialog
                    trailerKey={title.trailerKey}
                    title={title.title}
                    label={t("trailer")}
                    size="lg"
                  />
                ) : null}

                <ReportDialog titleId={title.id} title={title.title} />
              </div>

              <div className="mt-4">
                <ShareRow title={title.title} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pb-12">
        <OffersPanel offers={title.offers} />

        {title.episodeCount > 0 ? <EpisodeList seasons={title.seasons} /> : null}

        <CastRail people={title.cast} heading={t("cast")} />
        <CastRail people={title.crew} heading={t("crew")} />

        <TitleRail
          title={t("related")}
          items={related}
          href={catalogHref(title)}
          actionLabel={t("backToCatalog")}
        />

        <p className="mt-10 text-xs text-[var(--fg-dim)]">{t("metadataNote")}</p>
      </div>
    </article>
  );
}
