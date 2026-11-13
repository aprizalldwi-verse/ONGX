import Image from "next/image";
import { Play } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { SeasonView } from "@/lib/titles/view";

export interface EpisodeListProps {
  seasons: SeasonView[];
  active?: { season: number; number: number } | undefined;
}

export async function EpisodeList({ seasons, active }: EpisodeListProps) {
  const t = await getTranslations("episodes");
  const firstSeason = seasons[0]?.number;

  if (seasons.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-3 rounded-[var(--radius)] border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--fg-dim)]">
          {t("empty")}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold tracking-tight">{t("title")}</h2>

      <div className="mt-3 space-y-2">
        {seasons.map((season) => {
          const isActiveSeason = active?.season === season.number;
          const open = isActiveSeason || (!active && season.number === firstSeason);

          return (
            <details
              key={season.number}
              open={open}
              className="group rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
                <span>
                  {t("season", { number: season.number })}
                  <span className="ml-2 text-xs font-normal text-[var(--fg-dim)]">
                    {t("episodeTotal", { count: season.episodes.length })}
                  </span>
                </span>
                <span className="text-xs text-[var(--fg-dim)] transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>

              <ol className="space-y-1 border-t border-[var(--line)] p-2">
                {season.episodes.map((episode) => {
                  const current =
                    active?.season === episode.season && active.number === episode.number;

                  return (
                    <li key={episode.id}>
                      <Link
                        href={episode.href}
                        aria-current={current ? "page" : undefined}
                        className={`flex gap-3 rounded-[var(--radius)] p-2 transition-colors ${
                          current
                            ? "bg-[var(--surface-2)] ring-1 ring-[var(--accent)]"
                            : "hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-[8px] bg-[var(--surface-2)] sm:w-36">
                          {episode.stillUrl ? (
                            <Image
                              src={episode.stillUrl}
                              alt=""
                              fill
                              sizes="144px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[var(--fg-dim)]">
                              <Play aria-hidden="true" className="size-5" />
                            </span>
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-[var(--fg-dim)]">
                              {t("episode", { number: episode.number })}
                            </span>
                            {current ? (
                              <span className="text-[11px] font-semibold text-[var(--accent)]">
                                {t("current")}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 line-clamp-1 block text-sm font-medium">
                            {episode.name}
                          </span>
                          {episode.synopsis ? (
                            <span className="mt-1 line-clamp-2 block text-xs text-[var(--fg-dim)]">
                              {episode.synopsis}
                            </span>
                          ) : null}
                          <span className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-[var(--fg-dim)]">
                            {episode.airDateLabel ? (
                              <span>{t("airDate", { date: episode.airDateLabel })}</span>
                            ) : null}
                            {episode.durationLabel ? <span>{episode.durationLabel}</span> : null}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </details>
          );
        })}
      </div>
    </section>
  );
}
