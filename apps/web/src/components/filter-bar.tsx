import { Button } from "@ongx/ui";
import { SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { localizedPath } from "@/lib/paths";
import type { BrowseFilters } from "@/lib/titles/filters";
import type { GenreWithCount } from "@/lib/titles/queries";

export interface FilterBarProps {
  locale: string;
  basePath: string;
  filters: BrowseFilters;
  genres: GenreWithCount[];
  years: number[];
  showGenre?: boolean;
  showYear?: boolean;
  showProvider?: boolean;
  showSort?: boolean;
}

const selectClass =
  "h-10 min-w-0 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--fg)] outline-none focus-visible:border-[var(--accent)]";

export async function FilterBar({
  locale,
  basePath,
  filters,
  genres,
  years,
  showGenre = true,
  showYear = true,
  showProvider = true,
  showSort = true,
}: FilterBarProps) {
  const t = await getTranslations("browse");
  const action = localizedPath(locale, basePath);

  return (
    <form
      action={action}
      method="get"
      className="mt-6 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-end gap-2">
        <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--fg-dim)] sm:mb-0 sm:self-center">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          {t("filters")}
        </span>

        {showGenre ? (
          <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-[var(--fg-dim)] sm:max-w-[220px]">
            {t("genre")}
            <select name="genre" defaultValue={filters.genre ?? ""} className={selectClass}>
              <option value="">{t("all")}</option>
              {genres.map((genre) => (
                <option key={genre.slug} value={genre.slug}>
                  {locale === "en" ? genre.nameEn : genre.nameId} ({genre.count})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showYear ? (
          <label className="flex min-w-[104px] flex-col gap-1 text-xs text-[var(--fg-dim)]">
            {t("year")}
            <select name="year" defaultValue={filters.year ?? ""} className={selectClass}>
              <option value="">{t("all")}</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showProvider ? (
          <label className="flex min-w-[170px] flex-col gap-1 text-xs text-[var(--fg-dim)]">
            {t("provider")}
            <select name="provider" defaultValue={filters.provider ?? ""} className={selectClass}>
              <option value="">{t("all")}</option>
              <option value="vidio">{t("providerVidio")}</option>
            </select>
          </label>
        ) : null}

        {showSort ? (
          <label className="flex min-w-[150px] flex-col gap-1 text-xs text-[var(--fg-dim)]">
            {t("sort")}
            <select name="sort" defaultValue={filters.sort ?? "popularity"} className={selectClass}>
              <option value="popularity">{t("sortPopularity")}</option>
              <option value="rating">{t("sortRating")}</option>
              <option value="newest">{t("sortNewest")}</option>
            </select>
          </label>
        ) : null}

        <Button type="submit" size="sm" className="h-10">
          {t("apply")}
        </Button>

        <Button asChild variant="ghost" size="sm" className="h-10">
          <Link href={basePath}>{t("reset")}</Link>
        </Button>
      </div>
    </form>
  );
}
