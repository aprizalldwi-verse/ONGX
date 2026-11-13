import { Button } from "@ongx/ui";
import { Play, Star } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { HeroView } from "@/lib/titles/view";

import { TrailerDialog } from "./trailer-dialog";

export interface HeroProps {
  item: HeroView;
}

export async function Hero({ item }: HeroProps) {
  const t = await getTranslations("home");

  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--line)]">
      {item.backdropUrl ? (
        <Image
          src={item.backdropUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-45"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-[var(--bg)]/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-transparent to-transparent" />

      <div className="relative mx-auto flex w-full max-w-6xl gap-6 px-4 py-12 sm:py-16">
        {item.posterUrl ? (
          <div className="relative hidden w-44 shrink-0 self-end overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] shadow-2xl sm:block lg:w-52">
            <Image
              src={item.posterUrl}
              alt=""
              width={342}
              height={513}
              sizes="208px"
              className="h-auto w-full object-cover"
            />
          </div>
        ) : null}

        <div className="max-w-2xl self-end">
          <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--bg)]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] backdrop-blur">
            {t("heroKicker")}
          </span>

          <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {item.title}
          </h1>

          {item.titleSecondary ? (
            <p className="mt-1 text-sm text-[var(--fg-dim)]">{item.titleSecondary}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--fg-dim)]">
            {item.year ? <span>{item.year}</span> : null}
            {item.rating !== undefined ? (
              <span className="inline-flex items-center gap-1">
                <Star
                  aria-hidden="true"
                  className="size-4 fill-[var(--accent)] text-[var(--accent)]"
                />
                {item.rating.toFixed(1)}
              </span>
            ) : null}
            {item.genres.slice(0, 3).map((genre) => (
              <Link
                key={genre.slug}
                href={genre.href}
                className="transition-colors hover:text-[var(--accent)]"
              >
                {genre.name}
              </Link>
            ))}
          </div>

          {item.synopsis ? (
            <p className="mt-4 line-clamp-3 max-w-prose text-sm leading-relaxed text-[var(--fg-dim)]">
              {item.synopsis}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href={item.watchHref}>
                <Play aria-hidden="true" />
                {t("watchNow")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={item.href}>{t("details")}</Link>
            </Button>
            {item.trailerKey ? (
              <TrailerDialog
                trailerKey={item.trailerKey}
                title={item.title}
                label={t("trailer")}
                size="lg"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
