"use client";

import { useCallback, useRef } from "react";

import type { Source } from "@ongx/shared";

import { Player } from "@/components/player";
import {
  readContinue,
  upsertContinue,
  writeContinue,
  type ContinueEntry,
} from "@/lib/continue-watching";
import { resumeKey } from "@/lib/player-state";

export interface WatchPlayerTitle {
  id: string;
  slug: string;
  source: Source;
  kind: "MOVIE" | "SERIES";
  title: string;
  posterUrl?: string | undefined;
}

export interface WatchPlayerEpisode {
  season: number;
  number: number;
  name: string;
}

export interface WatchPlayerProps {
  streamUrl: string;
  title: WatchPlayerTitle;
  episode?: WatchPlayerEpisode | undefined;
}

export function WatchPlayer({ streamUrl, title, episode }: WatchPlayerProps) {
  const lastWriteRef = useRef(0);

  const handleProgress = useCallback(
    (position: number, duration: number): void => {
      const now = Date.now();
      if (now - lastWriteRef.current < 5_000) return;
      lastWriteRef.current = now;

      try {
        const storage = window.localStorage;
        const entry: ContinueEntry = {
          titleId: title.id,
          slug: title.slug,
          source: title.source,
          kind: title.kind,
          title: title.title,
          ...(title.posterUrl !== undefined ? { posterUrl: title.posterUrl } : {}),
          ...(episode !== undefined
            ? { season: episode.season, number: episode.number, episodeName: episode.name }
            : {}),
          positionSec: Math.floor(position),
          ...(Number.isFinite(duration) && duration > 0
            ? { durationSec: Math.floor(duration) }
            : {}),
          updatedAt: now,
        };

        writeContinue(storage, upsertContinue(readContinue(storage), entry));
      } catch {
        // Storage may be unavailable; playback continues regardless.
      }
    },
    [episode, title],
  );

  const storageKey = resumeKey(title.id, episode?.season, episode?.number);

  return (
    <Player
      src={streamUrl}
      title={episode ? `${title.title} — ${episode.name}` : title.title}
      poster={title.posterUrl}
      storageKey={storageKey}
      onProgress={handleProgress}
    />
  );
}
