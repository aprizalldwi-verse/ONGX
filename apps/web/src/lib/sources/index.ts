import "server-only";

import type { Source } from "@ongx/shared";

import { getAniListAdapter } from "./anilist";
import { getTmdbAdapter } from "./tmdb";

export type CatalogSource = Extract<Source, "TMDB" | "ANILIST">;

/**
 * Adapter registry keyed by the stored `Source`. `OWN` titles never hit a
 * remote source; callers should resolve them from the database only.
 */
export function getAdapter(source: CatalogSource) {
  return source === "ANILIST" ? getAniListAdapter() : getTmdbAdapter();
}
