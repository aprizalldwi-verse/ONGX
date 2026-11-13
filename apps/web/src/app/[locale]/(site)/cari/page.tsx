import { Search } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { PosterGrid } from "@/components/poster-grid";
import { SearchCommand } from "@/components/search-command";
import { searchQuerySchema, SEARCH_MIN_LENGTH } from "@/lib/search";
import type { SearchParams } from "@/lib/titles/filters";
import { searchTitles } from "@/lib/titles/queries";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.search");

  return {
    title: t("title"),
    description: t("body"),
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("search");
  const page = await getTranslations("pages.search");

  const raw = await searchParams;
  const parsed = searchQuerySchema.safeParse({ q: first(raw.q) });
  const items = parsed.success ? await searchTitles(parsed.data.q, locale) : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {page("title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-dim)]">{page("body")}</p>
      </header>

      <div className="mt-6 max-w-xl">
        <SearchCommand
          key={parsed.success ? parsed.data.q : "empty"}
          variant="inline"
          initialQuery={parsed.success ? parsed.data.q : ""}
        />
      </div>

      {!parsed.success ? (
        <EmptyState
          icon={Search}
          title={t("promptTitle")}
          body={t("promptBody", { min: SEARCH_MIN_LENGTH })}
          className="mt-8"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("noResultsTitle")}
          body={t("noResultsBody")}
          className="mt-8"
        />
      ) : (
        <section className="mt-8" aria-labelledby="search-results-heading">
          <h2
            id="search-results-heading"
            className="text-xs font-medium uppercase tracking-wide text-[var(--fg-dim)]"
          >
            {t("resultsFor", { query: parsed.data.q })} ·{" "}
            {t("resultCount", { count: items.length })}
          </h2>
          <div className="mt-4">
            <PosterGrid items={items} />
          </div>
        </section>
      )}
    </div>
  );
}
