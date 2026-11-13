"use client";

import { Button } from "@ongx/ui";
import { History, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
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

/**
 * Full history view backed by the same `ongx:continue` storage as the home
 * rail. Finished entries are filtered out by `readContinue`, so this never
 * links back to the credits.
 */
export function HistoryList() {
  const t = useTranslations("library");
  const [entries, setEntries] = useState<ContinueEntry[] | null>(null);

  useEffect(() => {
    setEntries(readContinue(window.localStorage));
  }, []);

  function remove(key: string): void {
    if (entries === null) return;
    const next = removeContinue(entries, key);
    writeContinue(window.localStorage, next);
    setEntries(next);
  }

  if (entries === null) {
    return (
      <div role="status">
        <span className="sr-only">{t("loading")}</span>
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState icon={History} title={t("emptyHistoryTitle")} body={t("emptyHistoryBody")} />
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => {
        const key = entryKey(entry);
        const percent = continuePercent(entry);
        const episode =
          entry.season !== undefined && entry.number !== undefined
            ? { season: entry.season, number: entry.number }
            : undefined;

        return (
          <li
            key={key}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3"
          >
            <Link
              href={watchPath(entry.titleId, episode)}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              {entry.posterUrl ? (
                <Image
                  src={entry.posterUrl}
                  alt=""
                  width={56}
                  height={84}
                  loading="lazy"
                  className="h-[84px] w-14 shrink-0 rounded object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="h-[84px] w-14 shrink-0 rounded bg-[var(--surface-2)]"
                />
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{entry.title}</span>
                {episode ? (
                  <span className="mt-0.5 block text-xs text-[var(--fg-dim)]">
                    {t("historyEpisode", { season: episode.season, number: episode.number })}
                    {entry.episodeName ? ` · ${entry.episodeName}` : ""}
                  </span>
                ) : null}
                <span
                  className="mt-2 block h-1 w-full max-w-xs overflow-hidden rounded-full bg-[var(--surface-2)]"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="mt-1 block text-xs text-[var(--fg-dim)]">
                  {t("historyProgress", { percent })}
                </span>
              </span>
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(key)}
              aria-label={t("removeFromHistory")}
              className="text-[var(--fg-dim)]"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
