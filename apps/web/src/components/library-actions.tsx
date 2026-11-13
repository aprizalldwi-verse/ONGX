"use client";

import { Button } from "@ongx/ui";
import { Bookmark, BookmarkCheck, ListChecks, ListPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  addToPlaylist,
  isInPlaylist,
  isSaved,
  readPlaylist,
  readSaved,
  removeFromPlaylist,
  toLibraryEntry,
  toggleSaved,
  writePlaylist,
  writeSaved,
  type LibraryTitle,
} from "@/lib/library";

export interface LibraryActionsProps {
  title: LibraryTitle;
}

/**
 * Save + playlist buttons on the detail page. State is read after mount so the
 * server HTML and the first client render agree; the labels then update from
 * `localStorage` without a hydration mismatch.
 */
export function LibraryActions({ title }: LibraryActionsProps) {
  const t = useTranslations("library");
  const [saved, setSaved] = useState(false);
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    const storage = window.localStorage;
    setSaved(isSaved(readSaved(storage), title.id));
    setQueued(isInPlaylist(readPlaylist(storage), title.id));
  }, [title.id]);

  function toggleSave(): void {
    const storage = window.localStorage;
    const next = toggleSaved(readSaved(storage), toLibraryEntry(title));
    writeSaved(storage, next);
    setSaved(isSaved(next, title.id));
  }

  function togglePlaylist(): void {
    const storage = window.localStorage;
    const current = readPlaylist(storage);
    const next = isInPlaylist(current, title.id)
      ? removeFromPlaylist(current, title.id)
      : addToPlaylist(current, toLibraryEntry(title));
    writePlaylist(storage, next);
    setQueued(isInPlaylist(next, title.id));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={toggleSave} aria-pressed={saved}>
        {saved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
        {saved ? t("saved") : t("save")}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={togglePlaylist}
        aria-pressed={queued}
      >
        {queued ? <ListChecks aria-hidden="true" /> : <ListPlus aria-hidden="true" />}
        {queued ? t("inPlaylist") : t("addToPlaylist")}
      </Button>
    </div>
  );
}
