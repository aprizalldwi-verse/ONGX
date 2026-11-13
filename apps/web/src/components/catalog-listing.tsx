import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { PosterGrid } from "@/components/poster-grid";
import { getTranslations } from "next-intl/server";
import { Clapperboard } from "lucide-react";

import { browseQuery, parseBrowseFilters, type SearchParams } from "@/lib/titles/filters";
import { browseTitles, getGenres, getYears, type BrowseSort } from "@/lib/titles/queries";
import type { TitleKind } from "@/lib/titles/view";
import type { Source } from "@ongx/shared";

export interface CatalogListingProps {
  locale: string;
  basePath: string;
  heading: string;
  description: string;
  searchParams: SearchParams;
  kind?: TitleKind | undefined;
  source?: Source | undefined;
  fixedGenre?: string | undefined;
  defaultSort?: BrowseSort | undefined;
  showGenre?: boolean;
  showYear?: boolean;
  showSort?: boolean;
}

export async function CatalogListing({
  locale,
  basePath,
  heading,
  description,
  searchParams,
  kind,
  source,
  fixedGenre,
  defaultSort = "popularity",
  showGenre = true,
  showYear = true,
  showSort = true,
}: CatalogListingProps) {
  const t = await getTranslations("browse");
  const parsed = parseBrowseFilters(searchParams, defaultSort);
  const filters = fixedGenre !== undefined ? { ...parsed, genre: fixedGenre } : parsed;

  const [page, genres, years] = await Promise.all([
    browseTitles(
      {
        page: filters.page,
        sort: filters.sort,
        ...(kind !== undefined ? { kind } : {}),
        ...(source !== undefined ? { source } : {}),
        ...(filters.genre !== undefined ? { genre: filters.genre } : {}),
        ...(filters.year !== undefined ? { year: filters.year } : {}),
      },
      locale,
    ),
    getGenres(),
    getYears(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-2 text-sm text-[var(--fg-dim)]">{description}</p>
      </header>

      <FilterBar
        locale={locale}
        basePath={basePath}
        filters={filters}
        genres={genres}
        years={years}
        showGenre={showGenre && fixedGenre === undefined}
        showYear={showYear}
        showSort={showSort}
      />

      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-[var(--fg-dim)]">
        {t("results", { count: page.totalItems })}
      </p>

      <div className="mt-3">
        {page.items.length > 0 ? (
          <PosterGrid items={page.items} />
        ) : (
          <EmptyState
            icon={Clapperboard}
            title={t("emptyTitle")}
            body={t("emptyBody")}
            className="mt-2"
          />
        )}
      </div>

      <Pagination
        basePath={basePath}
        page={page.page}
        totalPages={page.totalPages}
        query={browseQuery({
          ...filters,
          ...(fixedGenre !== undefined ? { genre: undefined } : {}),
        })}
      />
    </div>
  );
}
