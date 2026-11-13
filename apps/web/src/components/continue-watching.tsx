"use client";

import { Play, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/i18n/navigation";
import {
  continuePercent,
  entryKey,
  readContinue,
  removeContinue,
  writeContinue,
  type ContinueEntry,
} from "@/lib/continue-watching";
import { watchPath } from "@/lib/titles/slug";

export function ContinueWatching() {
  const t = useTranslations("continue");
  const [entries, setEntries] = useState<ContinueEntry[]>([]);

  useEffect(() => {
    setEntries(readContinue(window.localStorage));
  }, []);

  function remove(key: string): void {
    const next = removeContinue(entries, key);
    setEntries(next);
    writeContinue(window.localStorage, next);
  }

  if (entries.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold tracking-tight">{t("title")}</h2>
      </div>

      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((entry) => {
          const key = entryKey(entry);
          const percent = continuePercent(entry);
          const href = watchPath(
            entry.titleId,
            entry.season !== undefined && entry.number !== undefined
              ? { season: entry.season, number: entry.number }
              : undefined,
          );

          return (
            <li
              key={key}
              className="group/card relative w-[180px] shrink-0 snap-start sm:w-[210px]"
            >
              <Link href={href} className="group block">
                <span className="relative block aspect-video overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)]">
                  {entry.posterUrl ? (
                    <Image
                      src={entry.posterUrl}
                      alt=""
                      fill
                      sizes="210px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[var(--fg-dim)]">
                      <Play aria-hidden="true" className="size-6" />
                    </span>
                  )}

                  <span className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                    <span
                      className="block h-full bg-[var(--accent)]"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </span>

                <span className="mt-1.5 line-clamp-1 block text-sm font-medium group-hover:text-[var(--accent)]">
                  {entry.title}
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-[var(--fg-dim)]">
                  {entry.season !== undefined && entry.number !== undefined ? (
                    <span>{t("episode", { season: entry.season, number: entry.number })}</span>
                  ) : (
                    <span />
                  )}
                  <span>{t("progress", { percent })}</span>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => remove(key)}
                aria-label={t("remove")}
                className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur transition-opacity focus-visible:opacity-100 group-hover/card:opacity-100 hover:bg-black"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
