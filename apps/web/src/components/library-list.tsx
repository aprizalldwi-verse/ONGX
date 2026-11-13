"use client";

import { Button } from "@ongx/ui";
import { BookmarkX, ListX, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { PosterCard } from "@/components/poster-card";
import {
  readPlaylist,
  readSaved,
  removeFromPlaylist,
  removeSaved,
  toLibraryCard,
  writePlaylist,
  writeSaved,
  type LibraryEntry,
} from "@/lib/library";

export interface LibraryListProps {
  list: "saved" | "playlist";
}

const GRID =
  "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

/**
 * Saved and playlist pages share the same grid. `entries === null` means "not
 * hydrated yet"; rendering skeletons for both the server pass and the first
 * client pass avoids a hydration mismatch.
 */
export function LibraryList({ list }: LibraryListProps) {
  const t = useTranslations("library");
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);

  useEffect(() => {
    const storage = window.localStorage;
    setEntries(list === "saved" ? readSaved(storage) : readPlaylist(storage));
  }, [list]);

  function remove(id: string): void {
    const storage = window.localStorage;

    if (list === "saved") {
      const next = removeSaved(readSaved(storage), id);
      writeSaved(storage, next);
      setEntries(next);
      return;
    }

    const next = removeFromPlaylist(readPlaylist(storage), id);
    writePlaylist(storage, next);
    setEntries(next);
  }

  if (entries === null) {
    return (
      <div role="status">
        <span className="sr-only">{t("loading")}</span>
        <div className={GRID} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="aspect-[2/3] animate-pulse rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return list === "saved" ? (
      <EmptyState icon={BookmarkX} title={t("emptySavedTitle")} body={t("emptySavedBody")} />
    ) : (
      <EmptyState icon={ListX} title={t("emptyPlaylistTitle")} body={t("emptyPlaylistBody")} />
    );
  }

  return (
    <ul className={GRID}>
      {entries.map((entry) => (
        <li key={entry.id} className="min-w-0">
          <PosterCard item={toLibraryCard(entry)} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-8 w-full text-[var(--fg-dim)]"
            onClick={() => remove(entry.id)}
          >
            <Trash2 aria-hidden="true" />
            {t("remove")}
          </Button>
        </li>
      ))}
    </ul>
  );
}
